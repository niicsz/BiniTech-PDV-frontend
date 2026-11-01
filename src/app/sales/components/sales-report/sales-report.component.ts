import { Component, HostListener, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { SaleService } from '../../../pos/services/sale.service';
import { RefundMethod, SaleDTO, SaleReturnDTO } from '../../../shared/models/api.models';
import { AnalyticsService } from '../../../core/analytics.service';
import { localIsoDate } from '../../../core/local-date';
import { FiscalService, NfceDocument, canPrintNfce } from '../../../fiscal/fiscal.service';
import { FiscalFeatureService } from '../../../fiscal/fiscal-feature.service';
import { AuthService } from '../../../auth/services/auth.service';
import { MatrixReceiptComponent } from '../../../shared/receipt/matrix-receipt.component';
import { buildReturnReceipt, buildSaleReceipt, printMatrix } from '../../../shared/receipt/matrix-receipt';
import {
  REFUND_LABELS, hasOpenCrediario, netAmount, netCost, returnedQuantity, round2, saleStatus,
} from '../../sale-amounts';

interface ReturnableItem {
  productId: string;
  description: string;
  sold: number;
  available: number;
  unitPrice: number;
}

const FULL_RETURN_CANCEL_REASON = 'Devolucao total da mercadoria pelo consumidor';

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

  returnMode = false;
  returnableItems: ReturnableItem[] = [];
  returnQuantities: Record<string, number> = {};
  refundMethod: RefundMethod = 'CASH';
  restock = true;
  returnReason = '';
  returnBusy = false;
  returnMessage = '';
  lastReturn: SaleReturnDTO | null = null;
  readonly refundOptions: RefundMethod[] = ['CASH', 'PIX', 'CREDIT_CARD', 'DEBIT_CARD'];
  readonly refundLabels = REFUND_LABELS;
  totalReturned = 0;

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
    this.totalRevenue = round2(this.sales.reduce((sum, sale) => sum + netAmount(sale), 0));
    this.totalCost = round2(this.sales.reduce((sum, sale) => sum + netCost(sale), 0));
    this.totalReturned = round2(this.sales.reduce((sum, sale) => sum + (sale.returnedAmount || 0), 0));
    this.totalProfit = round2(this.totalRevenue - this.totalCost);
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
      for (const item of (sale.returns || []).flatMap(r => r.items || [])) {
        const existing = map.get(item.productDescription || 'Desconhecido');
        if (existing) {
          existing.quantity -= item.quantity || 0;
          existing.revenue -= item.subtotal || 0;
        }
      }
    }
    const sorted = Array.from(map.values()).filter(p => p.quantity > 0).sort((a, b) => b.quantity - a.quantity || b.revenue - a.revenue);
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
    return round2(netAmount(sale) - netCost(sale));
  }

  netAmount(sale: SaleDTO): number {
    return netAmount(sale);
  }

  statusLabel(sale: SaleDTO): string {
    switch (saleStatus(sale)) {
      case 'RETURNED': return 'Devolvida';
      case 'PARTIALLY_RETURNED': return 'Devolução parcial';
      default: return '';
    }
  }

  get canReturn(): boolean {
    return !!this.selectedSale
      && saleStatus(this.selectedSale) !== 'RETURNED'
      && this.authService.canManageTenantUsers();
  }

  get openCrediario(): boolean {
    return !!this.selectedSale && hasOpenCrediario(this.selectedSale);
  }

  get returnTotal(): number {
    return round2(this.returnableItems.reduce(
      (sum, item) => sum + item.unitPrice * this.quantityFor(item), 0));
  }

  private quantityFor(item: ReturnableItem): number {
    const value = Math.floor(Number(this.returnQuantities[item.productId]) || 0);
    return Math.min(Math.max(value, 0), item.available);
  }

  startReturn(): void {
    const sale = this.selectedSale;
    if (!sale) return;
    const byProduct = new Map<string, ReturnableItem>();
    for (const item of sale.items ?? []) {
      if (!item.productId) continue;
      const current = byProduct.get(item.productId);
      if (current) {
        current.sold += item.quantity ?? 0;
      } else {
        byProduct.set(item.productId, {
          productId: item.productId,
          description: item.productDescription ?? 'Produto',
          sold: item.quantity ?? 0,
          available: 0,
          unitPrice: item.unitPrice ?? 0,
        });
      }
    }
    this.returnableItems = Array.from(byProduct.values())
      .map(item => ({ ...item, available: item.sold - returnedQuantity(sale, item.productId) }))
      .filter(item => item.available > 0);
    this.returnQuantities = {};
    this.refundMethod = this.openCrediario ? 'DEBT_DEDUCTION' : 'CASH';
    this.restock = true;
    this.returnReason = '';
    this.returnMessage = '';
    this.lastReturn = null;
    this.returnMode = true;
  }

  returnEverything(): void {
    for (const item of this.returnableItems) {
      this.returnQuantities[item.productId] = item.available;
    }
  }

  cancelReturn(): void {
    this.returnMode = false;
    this.returnMessage = '';
  }

  confirmReturn(): void {
    const sale = this.selectedSale;
    if (!sale?.id || this.returnBusy) return;
    const items = this.returnableItems
      .map(item => ({ productId: item.productId, quantity: this.quantityFor(item) }))
      .filter(item => item.quantity > 0);
    if (items.length === 0) {
      this.returnMessage = 'Escolha a quantidade de ao menos um item.';
      return;
    }
    this.returnBusy = true;
    this.returnMessage = '';
    this.saleService.registerReturn(sale.id, {
      items,
      refundMethod: this.openCrediario ? 'DEBT_DEDUCTION' : this.refundMethod,
      reason: this.returnReason.trim() || undefined,
      restock: this.restock,
    }).subscribe({
      next: (updated) => this.onReturnRegistered(updated),
      error: (err) => {
        this.returnBusy = false;
        this.returnMessage = err.error?.message || 'Não foi possível registrar a devolução.';
      },
    });
  }

  private onReturnRegistered(updated: SaleDTO): void {
    this.returnBusy = false;
    this.returnMode = false;
    this.sales = this.sales.map(s => (s.id === updated.id ? updated : s));
    this.calculateTotal();
    this.selectedSale = updated;
    this.receiptLines = this.saleReceipt(updated);
    this.lastReturn = (updated.returns ?? []).at(-1) ?? null;
    const full = saleStatus(updated) === 'RETURNED';
    this.analytics.track('sale_returned', {
      value: this.lastReturn?.refundAmount ?? 0,
      currency: 'BRL',
      full,
    });
    if (full && this.canCancelNfce) {
      this.showCancel = true;
      this.cancelReason = FULL_RETURN_CANCEL_REASON;
    }
  }

  printReturn(saleReturn: SaleReturnDTO | null): void {
    const sale = this.selectedSale;
    if (!sale || !saleReturn) return;
    const operator = saleReturn.userId === this.authService.getUserId() ? this.authService.getUsername() : null;
    printMatrix(buildReturnReceipt(sale, saleReturn, { operator }), `Devolucao ${sale.id?.slice(0, 8) ?? ''}`);
  }

  returnSummary(saleReturn: SaleReturnDTO): string {
    return (saleReturn.items ?? [])
      .map(item => `${item.quantity}x ${item.productDescription ?? 'Produto'}`)
      .join(', ');
  }

  private saleReceipt(sale: SaleDTO): string[] {
    return buildSaleReceipt(sale, { operator: sale.userId === this.authService.getUserId() ? this.authService.getUsername() : null });
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
    this.receiptLines = this.saleReceipt(sale);
    this.returnMode = false;
    this.returnMessage = '';
    this.lastReturn = null;
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

  @HostListener('document:keydown.escape')
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
