import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SaleService } from '../../../pos/services/sale.service';
import { SaleDTO } from '../../../shared/models/api.models';

interface DebtorGroup {
  customerName: string;
  customerPhone: string;
  sales: SaleDTO[];
  totalDebt: number;
  oldestDate: string;
  daysSinceOldest: number;
}

const WARNING_DAYS = 7;
const OVERDUE_DAYS = 30;

@Component({
  selector: 'app-debtors-list',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="debtors-page">
      <div class="page-header">
        <div>
          <h1>Devedores</h1>
          <p class="header-subtitle">
            @if (loading && debtorGroups.length === 0) {
              Carregando as vendas no crediário…
            } @else if (debtorGroups.length === 0) {
              Nenhuma venda no crediário aguardando pagamento.
            } @else {
              {{ debtorGroups[0].customerName || 'Cliente sem nome' }} deve há mais tempo:
              R$ {{ debtorGroups[0].totalDebt | number:'1.2-2' }} desde {{ debtorGroups[0].oldestDate | date:'dd/MM' }}.
            }
          </p>
        </div>
      </div>

      @if (loadError) {
        <div class="status-bar status-error" role="alert">
          <mat-icon>error</mat-icon>
          <span>{{ loadError }}</span>
          <button type="button" class="inline-action" (click)="loadDebtors()">Tentar de novo</button>
        </div>
      }

      <dl class="stats-strip">
        <div class="stat">
          <dt>A receber no crediário</dt>
          <dd class="lead">R$ {{ totalDebt | number:'1.2-2' }}</dd>
        </div>
        <div class="stat">
          <dt>Clientes devendo</dt>
          <dd>{{ debtorGroups.length }}</dd>
        </div>
        <div class="stat">
          <dt>Vendas em aberto</dt>
          <dd>{{ allDebtSales.length }}</dd>
        </div>
        <div class="stat">
          <dt>Há mais de {{ overdueDays }} dias</dt>
          <dd [class.is-negative]="overdueCount > 0">{{ overdueCount }}</dd>
        </div>
      </dl>

      <section class="table-card" aria-labelledby="debtors-title">
        <div class="panel-head">
          <h2 id="debtors-title">Quem cobrar</h2>
          <span class="aside">da dívida mais antiga para a mais recente</span>
        </div>

        @if (loading && debtorGroups.length === 0) {
          <ul class="debtor-list" aria-busy="true">
            @for (i of [1, 2, 3]; track i) {
              <li class="debtor skeleton-row">
                <span class="skeleton" style="width: 180px"></span>
                <span class="skeleton" style="width: 96px"></span>
              </li>
            }
          </ul>
        } @else if (debtorGroups.length === 0) {
          <div class="empty-state">
            <p>Todas as contas estão em dia. Quando uma venda for feita no crediário, o cliente aparece aqui.</p>
          </div>
        } @else {
          <ul class="debtor-list">
            @for (debtor of debtorGroups; track debtor.customerName + debtor.customerPhone) {
              <li class="debtor">
                <div class="debtor-head">
                  <span class="avatar" aria-hidden="true">{{ (debtor.customerName || '?').charAt(0) }}</span>
                  <div class="debtor-id">
                    <span class="debtor-name">{{ debtor.customerName || 'Cliente sem nome' }}</span>
                    <span class="debtor-meta">
                      @if (debtor.customerPhone) {
                        <span class="num">{{ formatPhone(debtor.customerPhone) }}</span>
                      }
                      <span>{{ debtor.sales.length }} {{ debtor.sales.length === 1 ? 'venda' : 'vendas' }}</span>
                    </span>
                  </div>
                  <div class="debtor-age">
                    @if (debtor.daysSinceOldest >= overdueDays) {
                      <span class="pill pill-negative">há {{ debtor.daysSinceOldest }} dias</span>
                    } @else if (debtor.daysSinceOldest >= warningDays) {
                      <span class="pill pill-warning">há {{ debtor.daysSinceOldest }} dias</span>
                    } @else {
                      <span class="muted">{{ ageLabel(debtor.daysSinceOldest) }}</span>
                    }
                  </div>
                  <strong class="debtor-total num">R$ {{ debtor.totalDebt | number:'1.2-2' }}</strong>
                  <div class="debtor-actions">
                    @if (debtor.customerPhone) {
                      <a mat-stroked-button [href]="whatsappLink(debtor)" target="_blank" rel="noopener noreferrer">
                        Cobrar no WhatsApp
                      </a>
                    }
                  </div>
                </div>

                <ul class="sales">
                  @for (sale of debtor.sales; track sale.id) {
                    <li class="sale">
                      <span class="sale-when num">{{ formatTimestamp(sale.timestamp) }}</span>
                      <span class="sale-items" [title]="itemsSummary(sale)">{{ itemsSummary(sale) }}</span>
                      <span class="sale-amount num">R$ {{ sale.totalAmount | number:'1.2-2' }}</span>
                      <button mat-stroked-button class="btn-mark-paid" (click)="markAsPaid(sale)"
                              [disabled]="sale.paid || payingId === sale.id">
                        {{ payingId === sale.id ? 'Salvando…' : 'Marcar como pago' }}
                      </button>
                    </li>
                  }
                </ul>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: [`
    .debtors-page {
      max-width: 1360px;
      margin: 0 auto;
    }
    .inline-action {
      margin-left: auto;
      border: 0;
      background: none;
      color: inherit;
      font-weight: 500;
      text-decoration: underline;
      text-underline-offset: 3px;
    }
    .table-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .debtor-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .debtor {
      padding: 16px 20px;
      border-bottom: 1px solid var(--border);
    }
    .debtor:last-child {
      border-bottom: 0;
    }
    .skeleton-row {
      display: flex;
      justify-content: space-between;
    }
    .skeleton {
      display: inline-block;
      height: 16px;
      border-radius: 3px;
      background: var(--surface-hover);
    }
    .debtor-head {
      display: grid;
      grid-template-columns: 36px minmax(0, 1fr) 120px 140px 190px;
      align-items: center;
      gap: 12px;
    }
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: #f6e3cf;
      color: #6b3a10;
      font-weight: 600;
      text-transform: uppercase;
    }
    .debtor-id {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .debtor-name {
      font-weight: 600;
      font-size: 15px;
    }
    .debtor-meta {
      display: flex;
      gap: 12px;
      color: var(--text-secondary);
      font-size: 13px;
    }
    .debtor-age {
      text-align: right;
    }
    .debtor-total {
      text-align: right;
      font-size: 18px;
      font-weight: 500;
    }
    .debtor-actions {
      display: flex;
      justify-content: flex-end;
    }
    .sales {
      list-style: none;
      margin: 12px 0 0 48px;
      padding: 0;
      border-top: 1px solid var(--border-light);
    }
    .sale {
      display: grid;
      grid-template-columns: 120px minmax(0, 1fr) 140px 190px;
      align-items: center;
      gap: 12px;
      min-height: 48px;
      border-bottom: 1px solid var(--border-light);
    }
    .sale:last-child {
      border-bottom: 0;
    }
    .sale-when {
      color: var(--text-secondary);
      font-size: 13px;
    }
    .sale-items {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      color: var(--text-secondary);
    }
    .sale-amount {
      text-align: right;
    }
    .btn-mark-paid {
      justify-self: end;
    }
    @media (max-width: 900px) {
      .debtor-head {
        grid-template-columns: 36px minmax(0, 1fr) auto;
        grid-template-areas:
          'avatar id total'
          'avatar age actions';
      }
      .avatar { grid-area: avatar; align-self: start; }
      .debtor-id { grid-area: id; }
      .debtor-total { grid-area: total; }
      .debtor-age { grid-area: age; text-align: left; }
      .debtor-actions { grid-area: actions; }
      .sales {
        margin-left: 0;
      }
      .sale {
        grid-template-columns: minmax(0, 1fr) auto;
        grid-template-areas:
          'items amount'
          'when action';
        padding: 8px 0;
      }
      .sale-items { grid-area: items; }
      .sale-amount { grid-area: amount; }
      .sale-when { grid-area: when; }
      .btn-mark-paid { grid-area: action; }
    }
  `]
})
export class DebtorsListComponent implements OnInit {
  allDebtSales: SaleDTO[] = [];
  debtorGroups: DebtorGroup[] = [];
  totalDebt = 0;
  loading = true;
  loadError = '';
  payingId: string | null = null;

  readonly warningDays = WARNING_DAYS;
  readonly overdueDays = OVERDUE_DAYS;

  constructor(private saleService: SaleService) {}

  get overdueCount(): number {
    return this.debtorGroups.filter(d => d.daysSinceOldest >= OVERDUE_DAYS).length;
  }

  ngOnInit(): void {
    this.loadDebtors();
  }

  loadDebtors(): void {
    this.loading = true;
    this.loadError = '';
    console.info('[DebtorsList] Carregando devedores');
    this.saleService.listDebtors().subscribe({
      next: (sales) => {
        this.allDebtSales = sales;
        this.groupDebtors(sales);
        this.totalDebt = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
        this.loading = false;
        console.info('[DebtorsList] Devedores carregados:', this.debtorGroups.length, 'grupos, total:', this.totalDebt);
      },
      error: () => {
        console.error('[DebtorsList] Erro ao carregar devedores');
        this.loading = false;
        this.loadError = 'Não foi possível carregar as vendas no crediário.';
      }
    });
  }

  groupDebtors(sales: SaleDTO[]): void {
    const grouped = new Map<string, SaleDTO[]>();

    for (const sale of sales) {
      const key = (sale.customerName || '') + '|' + (sale.customerPhone || '');
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(sale);
    }

    this.debtorGroups = Array.from(grouped.entries()).map(([key, groupSales]) => {
      const [name, phone] = key.split('|');
      const totalDebt = groupSales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
      const timestamps = groupSales
        .map(s => s.timestamp ? new Date(s.timestamp).getTime() : Date.now())
        .sort((a, b) => a - b);
      const oldestDate = new Date(timestamps[0]).toISOString();
      const daysSinceOldest = Math.floor((Date.now() - timestamps[0]) / (1000 * 60 * 60 * 24));

      return {
        customerName: name,
        customerPhone: phone,
        sales: groupSales.sort((a, b) => (a.timestamp ?? '').localeCompare(b.timestamp ?? '')),
        totalDebt,
        oldestDate,
        daysSinceOldest
      };
    }).sort((a, b) => b.daysSinceOldest - a.daysSinceOldest || b.totalDebt - a.totalDebt);
  }

  markAsPaid(sale: SaleDTO): void {
    if (!sale.id) return;
    console.info('[DebtorsList] Marcando venda como paga:', sale.id);
    this.payingId = sale.id;
    this.saleService.markAsPaid(sale.id).subscribe({
      next: () => {
        console.info('[DebtorsList] Venda marcada como paga com sucesso:', sale.id);
        this.payingId = null;
        this.loadDebtors();
      },
      error: () => {
        console.error('[DebtorsList] Erro ao marcar venda como paga:', sale.id);
        this.payingId = null;
        this.loadError = 'Não foi possível marcar a venda como paga. Nada foi alterado.';
      }
    });
  }

  ageLabel(days: number): string {
    if (days <= 0) return 'hoje';
    if (days === 1) return 'há 1 dia';
    return `há ${days} dias`;
  }

  itemsSummary(sale: SaleDTO): string {
    return (sale.items || []).map(i => `${i.quantity}× ${i.productDescription}`).join(', ');
  }

  whatsappLink(debtor: DebtorGroup): string {
    const amount = debtor.totalDebt.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const first = (debtor.customerName || '').split(' ')[0];
    const text = `Olá${first ? ', ' + first : ''}! Passando para lembrar do saldo de R$ ${amount} no crediário. Quando puder acertar, me avise.`;
    return `https://wa.me/55${this.cleanPhone(debtor.customerPhone)}?text=${encodeURIComponent(text)}`;
  }

  formatPhone(phone: string): string {
    const d = this.cleanPhone(phone);
    if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
    if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
    return phone;
  }

  formatTimestamp(ts?: string): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }

  cleanPhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }
}
