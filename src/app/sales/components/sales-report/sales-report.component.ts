import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { SaleService } from '../../../pos/services/sale.service';
import { SaleDTO, SaleItemDTO } from '../../../shared/models/api.models';
import { AnalyticsService } from '../../../core/analytics.service';
import { localIsoDate } from '../../../core/local-date';
import { FiscalService, NfceDocument } from '../../../fiscal/fiscal.service';

interface ProductRanking {
  name: string;
  quantity: number;
  revenue: number;
}

@Component({
  selector: 'app-sales-report',
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatChipsModule
  ],
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.scss']
})
export class SalesReportComponent implements OnInit {

  private fiscalService = inject(FiscalService);
  fiscalEnabled = false;
  nfceBySale: Record<string, NfceDocument | null | undefined> = {};
  nfceBusySale: string | null = null;

  sales: SaleDTO[] = [];
  filterMode: 'today' | 'period' = 'today';
  startDate = '';
  endDate = '';
  periodError = '';
  totalRevenue = 0;
  totalCost = 0;
  totalProfit = 0;
  topProducts: ProductRanking[] = [];
  bottomProducts: ProductRanking[] = [];

  constructor(private saleService: SaleService, private analytics: AnalyticsService) {}

  ngOnInit(): void {
    this.fiscalService.getProfile().subscribe({
      next: (profile) => (this.fiscalEnabled = !!profile?.readyToIssue),
      error: () => (this.fiscalEnabled = false),
    });
    this.loadToday();
  }

  loadToday(): void {
    this.filterMode = 'today';
    this.periodError = '';
    this.analytics.track('report_viewed', { period: 'day' });
    const today = localIsoDate();
    console.info('[SalesReport] Carregando vendas do dia:', today);
    this.saleService.listByDay(today).subscribe({
      next: (sales) => {
        this.sales = sales;
        this.calculateTotal();
        console.info('[SalesReport] Vendas do dia carregadas:', sales.length, 'receita:', this.totalRevenue);
      },
      error: () => {
        console.error('[SalesReport] Erro ao carregar vendas do dia');
        this.sales = [];
      }
    });
  }

  loadByPeriod(): void {
    if (!this.startDate || !this.endDate) {
      this.periodError = 'Informe a data inicial e a final.';
      return;
    }
    if (this.startDate > this.endDate) {
      this.periodError = 'A data inicial precisa ser anterior ou igual à final.';
      return;
    }
    this.periodError = '';
    this.filterMode = 'period';
    const days = Math.round((new Date(this.endDate).getTime() - new Date(this.startDate).getTime()) / 86_400_000) + 1;
    this.analytics.track('report_viewed', { period: 'custom', days: Number.isFinite(days) ? days : 0 });
    console.info('[SalesReport] Carregando vendas por período:', this.startDate, 'a', this.endDate);
    this.saleService.listByPeriod(this.startDate, this.endDate).subscribe({
      next: (sales) => {
        this.sales = sales;
        this.calculateTotal();
        console.info('[SalesReport] Vendas por período carregadas:', sales.length, 'receita:', this.totalRevenue);
      },
      error: () => {
        console.error('[SalesReport] Erro ao carregar vendas por período');
        this.sales = [];
      }
    });
  }

  calculateTotal(): void {
    this.totalRevenue = this.sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    this.totalCost = this.sales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
    this.totalProfit = this.totalRevenue - this.totalCost;
    this.calculateProductRanking();
  }

  calculateProductRanking(): void {
    const map = new Map<string, ProductRanking>();
    for (const sale of this.sales) {
      for (const item of sale.items || []) {
        const name = item.productDescription || 'Desconhecido';
        const existing = map.get(name) || { name, quantity: 0, revenue: 0 };
        existing.quantity += item.quantity || 0;
        existing.revenue += item.subtotal || 0;
        map.set(name, existing);
      }
    }
    const sorted = Array.from(map.values()).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
    this.topProducts = sorted.slice(0, 5);
    this.bottomProducts = sorted.slice(5).reverse().slice(0, 5);
  }

  getPaymentLabel(method: string | undefined): string {
    const labels: Record<string, string> = {
      'CASH': 'Dinheiro',
      'CREDIT_CARD': 'Crédito',
      'DEBIT_CARD': 'Débito',
      'PIX': 'PIX',
      'CREDIARIO': 'Crediário'
    };
    return method ? (labels[method] || method) : '';
  }

  formatTimestamp(ts: string | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('pt-BR');
  }

  getSaleProfit(sale: SaleDTO): number {
    return (sale.totalAmount || 0) - (sale.totalCost || 0);
  }

  nfceLabel(saleId: string | undefined): string {
    const document = saleId ? this.nfceBySale[saleId] : undefined;
    if (document === undefined) return 'NFC-e';
    if (document === null) return 'Emitir';
    switch (document.status) {
      case 'ISSUED': return `Nº ${document.numero}`;
      case 'CANCELLED': return 'Cancelada';
      case 'CANCELLING': return 'Cancelando';
      case 'ERROR': return 'Rejeitada';
      default: return 'Enviando';
    }
  }

  nfceAction(sale: SaleDTO): void {
    const saleId = sale.id;
    if (!saleId || this.nfceBusySale) return;
    this.nfceBusySale = saleId;
    this.fiscalService.getNfce(saleId).subscribe({
      next: (document) => {
        this.nfceBusySale = null;
        this.nfceBySale[saleId] = document;
        if (!document || document.status === 'ERROR') {
          const reason = document?.motivo ? `Última tentativa rejeitada: ${document.motivo}\n\n` : '';
          if (confirm(`${reason}Emitir NFC-e para a venda #${saleId.substring(0, 8)}?`)) {
            this.issue(saleId);
          }
        } else if (document.status === 'ISSUED') {
          this.issuedActions(saleId, document);
        } else {
          alert(`Situação da NFC-e: ${this.nfceLabel(saleId)}.`);
        }
      },
      error: (err) => {
        this.nfceBusySale = null;
        alert(err.error?.message || 'Não foi possível consultar a NFC-e.');
      },
    });
  }

  private issue(saleId: string): void {
    this.nfceBusySale = saleId;
    this.fiscalService.issueNfce(saleId, null).subscribe({
      next: (document) => {
        this.nfceBusySale = null;
        this.nfceBySale[saleId] = document;
        if (document.status === 'ERROR') {
          alert(`NFC-e rejeitada: ${document.motivo}`);
        }
      },
      error: (err) => {
        this.nfceBusySale = null;
        alert(err.error?.message || 'Não foi possível emitir a NFC-e.');
      },
    });
  }

  private issuedActions(saleId: string, document: NfceDocument): void {
    if (confirm(`NFC-e nº ${document.numero} autorizada. Abrir para imprimir?`)) {
      const popup = window.open('', '_blank');
      this.fiscalService.downloadDanfe(saleId).subscribe({
        next: (pdf) => {
          const url = URL.createObjectURL(pdf);
          if (popup) popup.location.href = url; else window.open(url, '_blank');
          setTimeout(() => URL.revokeObjectURL(url), 60000);
        },
        error: (err) => {
          popup?.close();
          alert(err.error?.message || 'Não foi possível abrir a NFC-e.');
        },
      });
      return;
    }
    const reason = prompt('Para CANCELAR esta NFC-e, informe o motivo (mínimo 15 caracteres):');
    if (!reason) return;
    this.nfceBusySale = saleId;
    this.fiscalService.cancelNfce(saleId, reason).subscribe({
      next: (cancelled) => {
        this.nfceBusySale = null;
        this.nfceBySale[saleId] = cancelled;
      },
      error: (err) => {
        this.nfceBusySale = null;
        alert(err.error?.message || 'Não foi possível cancelar a NFC-e.');
      },
    });
  }
}
