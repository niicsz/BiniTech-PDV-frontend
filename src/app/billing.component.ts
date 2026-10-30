import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BillingService, InvoiceDTO, SubscriptionDTO } from './billing.service';
import { AnalyticsService } from './core/analytics.service';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
  free: 'Cortesia',
};

const PLAN_PRICE: Record<string, number> = {
  starter: 99,
  pro: 199,
  enterprise: 349,
  free: 0,
};

const SUB_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  ACTIVE: 'Ativa',
  PAST_DUE: 'Pagamento atrasado',
  CANCELLED: 'Cancelada',
};

const INVOICE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente',
  PAID: 'Paga',
  OVERDUE: 'Vencida',
  CANCELLED: 'Cancelada',
};

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="billing">
      <header class="billing-head">
        <div>
          <a routerLink="/pdv" class="back">← Voltar ao PDV</a>
          <h1>Minha Assinatura</h1>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Atualizar</button>
      </header>

      <div *ngIf="loading()" class="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <ng-container *ngIf="!loading()">
        <div *ngIf="needsAction()" class="alert" [class.alert-danger]="isBlocked()">
          <mat-icon>{{ isBlocked() ? 'error' : 'info' }}</mat-icon>
          <div>
            <strong>{{ isBlocked() ? 'Assinatura suspensa' : 'Ative sua assinatura' }}</strong>
            <p>{{ alertMessage() }}</p>
          </div>
        </div>

        <section class="card sub-card">
          <div class="sub-main">
            <div>
              <span class="plan-name">Plano {{ planLabel() }}</span>
              <span class="plan-price" *ngIf="!isFree()">R$ {{ planPrice() | number:'1.2-2' }}<small>/mês</small></span>
              <span class="plan-price" *ngIf="isFree()">Grátis<small>vitalício</small></span>
            </div>
            <span class="badge" [class]="'st-' + (subscription()?.status || 'NONE')">
              {{ statusLabel() }}
            </span>
          </div>

          <div class="sub-meta" *ngIf="subscription() as s">
            <div class="meta-item">
              <span class="meta-lbl">Próxima cobrança</span>
              <span class="meta-val">{{ formatDate(s.nextBillingDate) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-lbl">Último pagamento</span>
              <span class="meta-val">{{ formatDate(s.lastPaymentDate) }}</span>
            </div>
            <div class="meta-item" *ngIf="s.failedPaymentCount > 0">
              <span class="meta-lbl">Tentativas falhas</span>
              <span class="meta-val danger">{{ s.failedPaymentCount }}</span>
            </div>
          </div>

          <ng-container *ngIf="!isFree()">
            <button mat-flat-button color="primary" class="pay-btn" (click)="pay()" [disabled]="paying()">
              <mat-spinner *ngIf="paying()" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!paying()">credit_card</mat-icon>
              {{ payButtonLabel() }}
            </button>
            <p class="pay-hint">
              Você será redirecionado ao Asaas para concluir o pagamento com cartão de crédito em segurança.<br>
              Se não conseguir pagar, entre em contato com o suporte.
            </p>
            <button mat-stroked-button class="manage-btn" *ngIf="canManage()" (click)="managePortal()" [disabled]="managing()">
              <mat-spinner *ngIf="managing()" diameter="20"></mat-spinner>
              <mat-icon *ngIf="!managing()">receipt_long</mat-icon>
              Pagar fatura em aberto
            </button>
          </ng-container>
          <p class="free-note" *ngIf="isFree()">
            <mat-icon>verified</mat-icon> Plano cortesia vitalício — acesso liberado, sem cobrança.
          </p>
        </section>

        <section class="card">
          <h2>Faturas</h2>
          <table class="invoice-table" *ngIf="invoices().length > 0">
            <thead>
              <tr><th>Descrição</th><th>Vencimento</th><th>Valor</th><th>Status</th></tr>
            </thead>
            <tbody>
              <tr *ngFor="let inv of invoices()">
                <td>{{ inv.description }}</td>
                <td>{{ formatDate(inv.dueDate) }}</td>
                <td>R$ {{ inv.amount | number:'1.2-2' }}</td>
                <td><span class="badge inv-{{ inv.status }}">{{ invoiceStatusLabel(inv.status) }}</span></td>
              </tr>
            </tbody>
          </table>
          <p *ngIf="invoices().length === 0" class="empty">Nenhuma fatura emitida ainda.</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .billing { max-width:860px; margin:0 auto; padding:40px 24px; }
    .billing-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:28px; }
    .back { color:var(--primary-text); text-decoration:none; font-size:13px; font-weight:600; }
    .back:hover { text-decoration:underline; }
    h1 { font-family:var(--font-display); margin:8px 0 0; font-size:34px; font-weight:800; letter-spacing:-1px; color:var(--text); }
    h2 { font-family:var(--font-display); font-size:20px; font-weight:700; margin:0 0 16px; color:var(--text); }
    .loading { display:flex; justify-content:center; padding:60px; }
    .card { background:var(--surface); border:2px solid var(--text); border-radius:var(--radius-md); padding:26px;
      box-shadow:6px 6px 0 var(--shadow-hard-color); margin-bottom:22px; }
    .alert { display:flex; gap:12px; align-items:flex-start; background:var(--info-bg); color:var(--text);
      border:1.5px solid var(--accent); border-radius:var(--radius-md); padding:16px 20px; margin-bottom:22px; }
    .alert p { margin:4px 0 0; font-size:13.5px; color:var(--text-secondary); }
    .alert strong { font-family:var(--font-display); }
    .alert-danger { background:var(--danger-bg); color:var(--danger); border-color:var(--danger); }
    .alert-danger p { color:var(--danger); }
    .sub-main { display:flex; justify-content:space-between; align-items:center; gap:16px; }
    .plan-name { display:block; font-family:var(--font-mono); font-size:12px; text-transform:uppercase; letter-spacing:.6px; color:var(--text-secondary); }
    .plan-price { font-family:var(--font-display); font-size:36px; font-weight:800; letter-spacing:-1.5px; color:var(--text); }
    .plan-price small { font-family:var(--font-mono); font-size:13px; font-weight:500; color:var(--text-tertiary); margin-left:4px; }
    .sub-meta { display:flex; gap:32px; flex-wrap:wrap; margin:24px 0; padding:20px 0; border-top:2px dashed var(--border); border-bottom:2px dashed var(--border); }
    .meta-item { display:flex; flex-direction:column; gap:4px; }
    .meta-lbl { font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.5px; color:var(--text-tertiary); }
    .meta-val { font-size:15px; font-weight:700; color:var(--text); }
    .meta-val.danger { color:var(--danger); }
    .badge { padding:4px 12px; border-radius:100px; font-family:var(--font-mono); font-size:11.5px; font-weight:700;
      white-space:nowrap; border:1.5px solid currentColor; }
    .st-ACTIVE { background:var(--success-bg); color:var(--success); }
    .st-PENDING { background:var(--warning-bg); color:var(--accent); }
    .st-PAST_DUE { background:var(--danger-bg); color:var(--primary-text); }
    .st-CANCELLED, .st-NONE { background:var(--surface-alt); color:var(--text-secondary); }
    .pay-btn { width:100%; height:50px; font-weight:700; margin-top:22px; display:flex; align-items:center; justify-content:center; gap:8px; }
    .pay-hint { text-align:center; font-size:12px; color:var(--text-tertiary); margin:10px 0 0; }
    .manage-btn { width:100%; height:46px; font-weight:600; margin-top:12px; display:flex; align-items:center; justify-content:center; gap:8px; }
    .free-note { display:flex; align-items:center; justify-content:center; gap:8px; margin:20px 0 0; padding:14px;
      background:var(--success-bg); color:var(--success); border:1.5px solid var(--success); border-radius:var(--radius); font-size:13.5px; font-weight:600; }
    .invoice-table { width:100%; border-collapse:separate; border-spacing:0; }
    .invoice-table th, .invoice-table td { text-align:left; padding:10px 12px; border-bottom:1.5px solid var(--border); font-size:13.5px; color:var(--text); }
    .invoice-table th { color:var(--table-header-text); font-family:var(--font-mono); font-weight:700; font-size:11.5px; text-transform:uppercase; letter-spacing:.5px; }
    .inv-PAID { background:var(--success-bg); color:var(--success); }
    .inv-PENDING { background:var(--warning-bg); color:var(--accent); }
    .inv-OVERDUE { background:var(--danger-bg); color:var(--danger); }
    .inv-CANCELLED { background:var(--surface-alt); color:var(--text-secondary); }
    .empty { color:var(--text-tertiary); text-align:center; padding:24px; }
  `]
})
export class BillingComponent implements OnInit {
  private billingService = inject(BillingService);
  private snackBar = inject(MatSnackBar);
  private analytics = inject(AnalyticsService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private checkoutReturned = false;

  subscription = signal<SubscriptionDTO | null>(null);
  invoices = signal<InvoiceDTO[]>([]);
  loading = signal(false);
  paying = signal(false);
  managing = signal(false);

  planTier = computed(() => this.subscription()?.planTier?.toLowerCase() ?? '');

  isFree = computed(() => this.planTier() === 'free');

  needsAction = computed(() => {
    if (this.isFree()) {
      return false;
    }
    const status = this.subscription()?.status;
    return !status || status !== 'ACTIVE';
  });

  isBlocked = computed(() => {
    const status = this.subscription()?.status;
    return status === 'PAST_DUE' || status === 'CANCELLED';
  });

  canManage = computed(() => {
    const sub = this.subscription();
    return (sub?.status === 'ACTIVE' || sub?.status === 'PAST_DUE') && !!sub?.asaasSubscriptionId;
  });

  ngOnInit(): void {
    // O Asaas volta para /billing?status=success (pago) ou /billing (cancelado).
    this.checkoutReturned = this.route.snapshot.queryParamMap.get('status') === 'success';
    if (this.checkoutReturned) {
      this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    } else {
      const pendingPlan = this.analytics.getSession('checkout_pending');
      if (pendingPlan !== null) {
        this.analytics.track('checkout_abandoned', { plan: pendingPlan || 'unknown' });
        this.analytics.setSession('checkout_pending', null);
      }
    }
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.billingService.getSubscription().subscribe({
      next: (sub) => {
        this.subscription.set(sub);
        this.loading.set(false);
        this.trackSubscription(sub);
      },
      error: (err: HttpErrorResponse) => {
        this.subscription.set(null);
        this.loading.set(false);
        if (err.status !== 404) {
          this.snackBar.open('Erro ao carregar assinatura.', 'OK', { duration: 4000 });
        }
      },
    });
    this.billingService.getInvoices().subscribe({
      next: (data) => {
        this.invoices.set(data);
        this.trackPlanExcess(data);
      },
      error: () => this.invoices.set([]),
    });
  }

  private trackSubscription(sub: SubscriptionDTO): void {
    const plan = sub.planTier?.toLowerCase() || 'unknown';
    const status = sub.status?.toLowerCase() || 'unknown';
    this.analytics.setUserProperties({ plan, subscription_status: status, tenant_age: this.ageBucket(sub.createdAt) });

    const previous = this.parseSnapshot(this.analytics.getState('billing_snapshot'));
    if (previous && previous.plan !== plan) {
      this.analytics.track('plan_changed', { from: previous.plan, to: plan });
    }
    if (previous && status === 'cancelled' && previous.status !== 'cancelled') {
      this.analytics.track('subscription_canceled', { plan });
    }
    this.analytics.setState('billing_snapshot', JSON.stringify({ plan, status }));

    if (this.checkoutReturned) {
      this.checkoutReturned = false;
      this.analytics.setSession('checkout_pending', null);
      const price = PLAN_PRICE[plan] ?? 0;
      this.analytics.track('purchase', {
        transaction_id: `${sub.id}-${sub.currentPeriodStart ?? sub.updatedAt}`,
        value: price,
        currency: 'BRL',
        items: [{ item_id: plan, item_name: PLAN_LABELS[plan] ?? plan, price, quantity: 1 }],
      });
    }
  }

  private trackPlanExcess(invoices: InvoiceDTO[]): void {
    for (const invoice of invoices) {
      if (invoice.excessAmount > 0) {
        this.analytics.trackOnce(`excess_${invoice.id}`, 'plan_limit_exceeded', {
          value: invoice.excessAmount,
          currency: 'BRL',
          plan: this.planTier() || 'unknown',
        });
      }
    }
  }

  private parseSnapshot(raw: string | null): { plan: string; status: string } | null {
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  private ageBucket(createdAt: string | null): string {
    const days = createdAt ? (Date.now() - new Date(createdAt).getTime()) / 86_400_000 : NaN;
    if (!Number.isFinite(days)) return 'unknown';
    if (days <= 7) return '0-7d';
    if (days <= 30) return '8-30d';
    if (days <= 90) return '31-90d';
    return '90d+';
  }

  pay(): void {
    this.paying.set(true);
    this.analytics.track('begin_checkout', { plan: this.planTier() || 'unknown' });
    this.analytics.setSession('checkout_pending', this.planTier());
    this.billingService.getCheckoutUrl().subscribe({
      next: ({ url }) => {
        window.location.href = url;
      },
      error: (error: HttpErrorResponse) => {
        this.paying.set(false);
        this.analytics.setSession('checkout_pending', null);
        this.snackBar.open(
          this.billingErrorMessage(error, 'Não foi possível gerar o link de pagamento.'),
          'OK',
          { duration: 7000 },
        );
      },
    });
  }

  managePortal(): void {
    this.managing.set(true);
    this.analytics.track('manage_subscription_opened', { plan: this.planTier() || 'unknown' });
    this.billingService.getPortalUrl().subscribe({
      next: ({ url }) => {
        window.location.href = url;
      },
      error: (error: HttpErrorResponse) => {
        this.managing.set(false);
        this.snackBar.open(
          this.billingErrorMessage(error, 'Não foi possível abrir a fatura em aberto.'),
          'OK',
          { duration: 7000 },
        );
      },
    });
  }

  planLabel(): string {
    return PLAN_LABELS[this.planTier()] ?? '—';
  }

  planPrice(): number {
    return PLAN_PRICE[this.planTier()] ?? 0;
  }

  statusLabel(): string {
    const status = this.subscription()?.status;
    return status ? (SUB_STATUS_LABEL[status] ?? status) : 'Sem assinatura';
  }

  invoiceStatusLabel(status: string): string {
    return INVOICE_STATUS_LABEL[status] ?? status;
  }

  payButtonLabel(): string {
    return this.isBlocked() ? 'Regularizar pagamento' : 'Assinar / Pagar agora';
  }

  alertMessage(): string {
    if (this.isBlocked()) {
      return 'Seu acesso ao sistema está suspenso por pagamento pendente. Regularize para reativar.';
    }
    return 'Conclua o pagamento para liberar todos os recursos da sua loja.';
  }

  private billingErrorMessage(error: HttpErrorResponse, fallback: string): string {
    const apiMessage = error.error?.message;
    if (typeof apiMessage === 'string' && apiMessage.trim()) {
      return apiMessage;
    }
    return `${fallback} Entre em contato com o suporte para realizar o pagamento.`;
  }

  formatDate(value: string | null): string {
    if (!value) {
      return '—';
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString('pt-BR');
  }
}
