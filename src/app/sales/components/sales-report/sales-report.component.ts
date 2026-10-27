import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { SaleService } from '../../../pos/services/sale.service';
import { SaleDTO, SaleItemDTO } from '../../../shared/models/api.models';

interface ProductRanking {
  name: string;
  quantity: number;
  revenue: number;
}

interface PaymentShare {
  method: string;
  label: string;
  amount: number;
  count: number;
}

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartão de crédito',
  DEBIT_CARD: 'Cartão de débito',
  PIX: 'Pix',
  CREDIARIO: 'Crediário'
};

function localDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

@Component({
  selector: 'app-sales-report',
  imports: [
    CommonModule, FormsModule,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule
  ],
  templateUrl: './sales-report.component.html',
  styleUrls: ['./sales-report.component.scss']
})
export class SalesReportComponent implements OnInit {

  sales: SaleDTO[] = [];
  filterMode: 'today' | 'period' = 'today';
  startDate = '';
  endDate = '';
  totalRevenue = 0;
  totalCost = 0;
  totalProfit = 0;
  topProducts: ProductRanking[] = [];
  bottomProducts: ProductRanking[] = [];
  payments: PaymentShare[] = [];
  loading = false;
  loadError = false;
  loadedAt: Date | null = null;

  get averageTicket(): number {
    return this.sales.length ? this.totalRevenue / this.sales.length : 0;
  }

  get margin(): number {
    return this.totalRevenue ? (this.totalProfit / this.totalRevenue) * 100 : 0;
  }

  get receivable(): number {
    return this.sales
      .filter(sale => !sale.paid)
      .reduce((sum, sale) => sum + (sale.payments || [])
        .filter(p => p.method === 'CREDIARIO')
        .reduce((s, p) => s + (p.amount || 0), 0), 0);
  }

  get maxPayment(): number {
    return Math.max(0, ...this.payments.map(p => p.amount));
  }

  get periodLabel(): string {
    if (this.filterMode === 'today') return 'hoje';
    const fmt = (v: string) => v.split('-').reverse().join('/');
    return `de ${fmt(this.startDate)} a ${fmt(this.endDate)}`;
  }

  constructor(private saleService: SaleService) {}

  ngOnInit(): void {
    this.loadToday();
  }

  loadToday(): void {
    this.filterMode = 'today';
    const today = localDate(new Date());
    console.info('[SalesReport] Carregando vendas do dia:', today);
    this.loading = true;
    this.loadError = false;
    this.saleService.listByDay(today).subscribe({
      next: (sales) => this.applySales(sales),
      error: () => {
        console.error('[SalesReport] Erro ao carregar vendas do dia');
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  selectPeriod(): void {
    this.filterMode = 'period';
    if (!this.startDate || !this.endDate) {
      const today = new Date();
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      this.startDate = localDate(start);
      this.endDate = localDate(today);
    }
    this.loadByPeriod();
  }

  loadByPeriod(): void {
    if (!this.startDate || !this.endDate) return;
    this.filterMode = 'period';
    console.info('[SalesReport] Carregando vendas por período:', this.startDate, 'a', this.endDate);
    this.loading = true;
    this.loadError = false;
    this.saleService.listByPeriod(this.startDate, this.endDate).subscribe({
      next: (sales) => this.applySales(sales),
      error: () => {
        console.error('[SalesReport] Erro ao carregar vendas por período');
        this.loading = false;
        this.loadError = true;
      }
    });
  }

  retry(): void {
    if (this.filterMode === 'today') {
      this.loadToday();
    } else {
      this.loadByPeriod();
    }
  }

  private applySales(sales: SaleDTO[]): void {
    this.sales = [...sales].sort((a, b) => (b.timestamp ?? '').localeCompare(a.timestamp ?? ''));
    this.calculateTotal();
    this.loading = false;
    this.loadedAt = new Date();
    console.info('[SalesReport] Vendas carregadas:', sales.length, 'receita:', this.totalRevenue);
  }

  calculateTotal(): void {
    this.totalRevenue = this.sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    this.totalCost = this.sales.reduce((sum, sale) => sum + (sale.totalCost || 0), 0);
    this.totalProfit = this.totalRevenue - this.totalCost;
    this.calculateProductRanking();
    this.calculatePayments();
  }

  calculatePayments(): void {
    const map = new Map<string, PaymentShare>();
    for (const sale of this.sales) {
      for (const payment of sale.payments || []) {
        const method = payment.method || 'OUTRO';
        const share = map.get(method) || { method, label: this.getPaymentLabel(method), amount: 0, count: 0 };
        share.amount += method === 'CASH' ? (payment.amount || 0) - (sale.change || 0) : (payment.amount || 0);
        share.count += 1;
        map.set(method, share);
      }
    }
    this.payments = Array.from(map.values()).sort((a, b) => b.amount - a.amount);
  }

  paymentWidth(amount: number): number {
    const max = this.maxPayment;
    return max ? (amount / max) * 100 : 0;
  }

  itemsSummary(sale: SaleDTO): string {
    return (sale.items || []).map(i => `${i.quantity}× ${i.productDescription}`).join(', ');
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
    const sorted = Array.from(map.values()).sort((a, b) => b.quantity - a.quantity);
    this.topProducts = sorted.slice(0, 5);
    this.bottomProducts = [...sorted].reverse().slice(0, 5);
  }

  getPaymentLabel(method: string | undefined): string {
    return method ? (PAYMENT_LABELS[method] || method) : '';
  }

  formatTimestamp(ts: string | undefined): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  getSaleProfit(sale: SaleDTO): number {
    return (sale.totalAmount || 0) - (sale.totalCost || 0);
  }
}
