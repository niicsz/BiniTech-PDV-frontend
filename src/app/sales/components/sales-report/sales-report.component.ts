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
import { FiscalService, NfceDocument, canPrintNfce } from '../../../fiscal/fiscal.service';
import { FiscalFeatureService } from '../../../fiscal/fiscal-feature.service';
import { AuthService } from '../../../auth/services/auth.service';
import { MatrixReceiptComponent } from '../../../shared/receipt/matrix-receipt.component';
import { buildSaleReceipt, printMatrix } from '../../../shared/receipt/matrix-receipt';

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
    MatFormFieldModule, MatInputModule, MatChipsModule, MatrixReceiptComponent
  ],
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.scss']
})
export class SalesReportComponent implements OnInit {

  private readonly fiscalService = inject(FiscalService);
  private readonly fiscalFeature = inject(FiscalFeatureService);
  private readonly authService = inject(AuthService);
  fiscalEnabled = false;
  selectedSale: SaleDTO | null = null;
  receiptLines: string[] = [];
  nfce: NfceDocument | null = null;
  nfceLoading = false;
  nfceBusy = false;
  nfceMessage = '';
  cancelReason = '';
  showCancel = false;

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
    this.fiscalFeature.ensureLoaded().subscribe((enabled) => (this.fiscalEnabled = enabled));
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

  get canCancelNfce(): boolean {
    return this.nfce?.status === 'AUTHORIZED' && this.authService.canManageTenantUsers();
  }

  get canPrintNfce(): boolean {
    return canPrintNfce(this.nfce);
  }

  get canIssueNfce(): boolean {
    return !this.nfce || this.nfce.status === 'AWAITING_REQUEST' || this.nfce.status === 'REJECTED';
  }

  openReceipt(sale: SaleDTO): void {
    this.selectedSale = sale;
    this.receiptLines = buildSaleReceipt(sale, { operator: sale.userId === this.authService.getUserId() ? this.authService.getUsername() : null });
    this.nfce = null;
    this.nfceMessage = '';
    this.showCancel = false;
    this.cancelReason = '';
    if (this.fiscalEnabled && sale.id) {
      this.nfceLoading = true;
      this.fiscalService.getNfce(sale.id).subscribe({
        next: (document) => {
          this.nfceLoading = false;
          this.nfce = document;
        },
        error: () => {
          this.nfceLoading = false;
          this.nfceMessage = 'Não foi possível consultar a NFC-e desta venda.';
        },
      });
    }
  }

  closeReceipt(): void {
    this.selectedSale = null;
  }

  printReceipt(): void {
    printMatrix(this.receiptLines, `Venda ${this.selectedSale?.id?.slice(0, 8) ?? ''}`);
  }

  nfceLabel(): string {
    const document = this.nfce;
    if (!document) return 'Ainda não emitida';
    switch (document.status) {
      case 'AUTHORIZED': return `NFC-e nº ${document.numero} autorizada`;
      case 'CONTINGENCY': return `NFC-e nº ${document.numero} em contingência (será transmitida)`;
      case 'CANCELLED': return `NFC-e nº ${document.numero} cancelada`;
      case 'REJECTED': return `Rejeitada: ${document.xMotivo ?? ''}`;
      case 'DENIED': return 'Uso denegado pela SEFAZ';
      case 'VOIDED': return 'Numeração inutilizada';
      case 'AWAITING_REQUEST': return 'Ainda não emitida';
      default: return 'Enviando para a SEFAZ...';
    }
  }

  issueNfce(): void {
    const saleId = this.selectedSale?.id;
    if (!saleId) return;
    this.nfceBusy = true;
    this.nfceMessage = '';
    this.fiscalService.issueNfce(saleId, this.selectedSale?.customerCpf ?? null).subscribe({
      next: (document) => {
        this.nfceBusy = false;
        this.nfce = document;
      },
      error: (err) => {
        this.nfceBusy = false;
        this.nfceMessage = err.error?.message || 'Não foi possível emitir a NFC-e.';
      },
    });
  }

  printNfce(): void {
    const saleId = this.selectedSale?.id;
    if (!saleId) return;
    const popup = window.open('', '_blank');
    this.fiscalService.downloadDanfe(saleId).subscribe({
      next: (pdf) => {
        const url = URL.createObjectURL(pdf);
        if (popup) popup.location.href = url; else window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60000);
      },
      error: (err) => {
        popup?.close();
        this.nfceMessage = err.error?.message || 'Não foi possível abrir a NFC-e.';
      },
    });
  }

  cancelNfce(): void {
    const saleId = this.selectedSale?.id;
    if (!saleId) return;
    if (this.cancelReason.trim().length < 15) {
      this.nfceMessage = 'Informe o motivo do cancelamento com pelo menos 15 caracteres.';
      return;
    }
    this.nfceBusy = true;
    this.nfceMessage = '';
    this.fiscalService.cancelNfce(saleId, this.cancelReason.trim()).subscribe({
      next: (document) => {
        this.nfceBusy = false;
        this.nfce = document;
        this.showCancel = false;
      },
      error: (err) => {
        this.nfceBusy = false;
        this.nfceMessage = err.error?.message || 'Não foi possível cancelar a NFC-e.';
      },
    });
  }
}
