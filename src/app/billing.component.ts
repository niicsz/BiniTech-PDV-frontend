import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BillingService, InvoiceDTO, SubscriptionDTO } from './billing.service';

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
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="billing">
      <header class="page-header">
        <div>
          <h1>Assinatura</h1>
          <p class="header-subtitle">
            @if (loading()) {
              Carregando a assinatura da loja…
            } @else if (isFree()) {
              Plano cortesia, sem cobrança.
            } @else if (!subscription()) {
              A loja ainda não tem assinatura. Assine para continuar usando o caixa depois do período de teste.
            } @else {
              Plano {{ planLabel() }}, {{ statusLabel().toLowerCase() }}.
              @if (subscription()?.nextBillingDate) { Próxima cobrança em {{ formatDate(subscription()!.nextBillingDate) }}. }
            }
          </p>
        </div>
        <button mat-stroked-button (click)="load()" [disabled]="loading()">Atualizar</button>
      </header>

      @if (loading()) {
        <div class="panel loading-panel" aria-busy="true">
          <span class="skeleton" style="width: 160px"></span>
          <span class="skeleton tall" style="width: 220px"></span>
        </div>
      } @else {
        @if (needsAction()) {
          <div class="status-bar" [class.status-error]="isBlocked()" role="status">
            <mat-icon aria-hidden="true">{{ isBlocked() ? 'error' : 'info' }}</mat-icon>
            <span><strong>{{ isBlocked() ? 'Acesso suspenso.' : 'Assinatura pendente.' }}</strong> {{ alertMessage() }}</span>
          </div>
        }

        <div class="billing-grid">
          <section class="panel sub-card" aria-labelledby="plan-title">
            <div class="panel-head">
              <h2 id="plan-title">Plano</h2>
              @if (subscription(); as s) {
                <span class="pill" [ngClass]="statusPill(s.status)">{{ statusLabel() }}</span>
              } @else if (!isFree()) {
                <span class="pill pill-neutral">Sem assinatura</span>
              }
            </div>
            <div class="sub-body">
              @if (isFree()) {
                <p class="plan-price">Cortesia</p>
                <p class="muted">Acesso liberado sem cobrança, sem data de término.</p>
              } @else if (subscription()) {
                <p class="plan-name">{{ planLabel() }}</p>
                <p class="plan-price num">R$ {{ planPrice() | number:'1.2-2' }}<small> por mês</small></p>
              } @else {
                <p class="plan-name">Nenhum plano ativo</p>
                <p class="muted">Starter R$ 99, Pro R$ 199 ou Enterprise R$ 349 por mês. O plano é escolhido no pagamento.</p>
              }

              @if (subscription(); as s) {
                <dl class="sub-meta">
                  <div>
                    <dt>Próxima cobrança</dt>
                    <dd class="num">{{ formatDate(s.nextBillingDate) }}</dd>
                  </div>
                  <div>
                    <dt>Último pagamento</dt>
                    <dd class="num">{{ formatDate(s.lastPaymentDate) }}</dd>
                  </div>
                  @if (s.failedPaymentCount > 0) {
                    <div>
                      <dt>Tentativas recusadas</dt>
                      <dd class="num is-negative">{{ s.failedPaymentCount }}</dd>
                    </div>
                  }
                </dl>
              }

              @if (!isFree()) {
                <div class="sub-actions">
                  <button mat-flat-button color="primary" class="pay-btn" (click)="pay()" [disabled]="paying()">
                    {{ paying() ? 'Abrindo o pagamento…' : payButtonLabel() }}
                  </button>
                  @if (canManage()) {
                    <button mat-stroked-button class="manage-btn" (click)="managePortal()" [disabled]="managing()">
                      {{ managing() ? 'Abrindo…' : 'Gerenciar assinatura' }}
                    </button>
                  }
                </div>
                <p class="pay-hint">O pagamento é feito no Stripe. Se não conseguir pagar, fale com o suporte pelo botão Ajuda.</p>
              }
            </div>
          </section>

          <section class="panel" aria-labelledby="invoices-title">
            <div class="panel-head">
              <h2 id="invoices-title">Faturas</h2>
              <span class="aside">{{ invoices().length }} {{ invoices().length === 1 ? 'fatura' : 'faturas' }}</span>
            </div>
            @if (invoices().length > 0) {
              <table class="data-table">
                <thead>
                  <tr>
                    <th scope="col">Descrição</th>
                    <th scope="col" class="num-col">Vencimento</th>
                    <th scope="col" class="num-col">Valor</th>
                    <th scope="col">Situação</th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let inv of invoices()">
                    <td>{{ inv.description }}</td>
                    <td class="num-col num">{{ formatDate(inv.dueDate) }}</td>
                    <td class="num-col num">R$ {{ inv.amount | number:'1.2-2' }}</td>
                    <td><span class="pill" [ngClass]="invoicePill(inv.status)">{{ invoiceStatusLabel(inv.status) }}</span></td>
                  </tr>
                </tbody>
              </table>
            } @else {
              <div class="empty-state">
                <p>Nenhuma fatura emitida ainda. Elas aparecem aqui depois do primeiro pagamento.</p>
              </div>
            }
          </section>
        </div>
      }
    </div>
  `,
  styles: [`
    .billing {
      max-width: 1360px;
      margin: 0 auto;
    }
    .billing-grid {
      display: grid;
      grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
      gap: 16px;
      align-items: start;
    }
    .loading-panel {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 20px;
    }
    .skeleton {
      display: inline-block;
      height: 14px;
      border-radius: 3px;
      background: var(--surface-hover);
    }
    .skeleton.tall {
      height: 32px;
    }
    .sub-body {
      padding: 16px 20px 20px;
    }
    .plan-name {
      font-weight: 500;
    }
    .plan-price {
      margin-top: 2px;
      font-size: 30px;
      line-height: 36px;
      font-weight: 500;
      letter-spacing: -0.02em;
    }
    .plan-price small {
      font-family: var(--font-family);
      font-size: 14px;
      font-weight: 400;
      color: var(--text-secondary);
    }
    .sub-meta {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin: 16px 0 0;
      padding-top: 16px;
      border-top: 1px solid var(--border-light);
    }
    .sub-meta dt {
      color: var(--text-secondary);
      font-size: 13px;
    }
    .sub-meta dd {
      margin-top: 2px;
      font-weight: 500;
    }
    .is-negative {
      color: var(--danger);
    }
    .sub-actions {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
      margin-top: 20px;
    }
    .pay-hint {
      margin-top: 8px;
      color: var(--text-secondary);
      font-size: 13px;
    }
    @media (max-width: 900px) {
      .billing-grid {
        grid-template-columns: 1fr;
      }
      .pay-btn,
      .manage-btn {
        flex: 1 1 100%;
      }
    }
  `]
})
export class BillingComponent implements OnInit {
  private billingService = inject(BillingService);
  private snackBar = inject(MatSnackBar);

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
    return sub?.status === 'ACTIVE' && !!sub?.stripeCustomerId;
  });

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.billingService.getSubscription().subscribe({
      next: (sub) => {
        this.subscription.set(sub);
        this.loading.set(false);
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
      next: (data) => this.invoices.set(data),
      error: () => this.invoices.set([]),
    });
  }

  pay(): void {
    this.paying.set(true);
    this.billingService.getCheckoutUrl().subscribe({
      next: ({ url }) => {
        window.location.href = url;
      },
      error: (error: HttpErrorResponse) => {
        this.paying.set(false);
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
    this.billingService.getPortalUrl().subscribe({
      next: ({ url }) => {
        window.location.href = url;
      },
      error: (error: HttpErrorResponse) => {
        this.managing.set(false);
        this.snackBar.open(
          this.billingErrorMessage(error, 'Não foi possível abrir a gestão de assinatura.'),
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

  statusPill(status: string): string {
    if (status === 'ACTIVE') return 'pill-positive';
    if (status === 'PAST_DUE') return 'pill-negative';
    if (status === 'PENDING') return 'pill-warning';
    return 'pill-neutral';
  }

  invoicePill(status: string): string {
    if (status === 'PAID') return 'pill-positive';
    if (status === 'OVERDUE') return 'pill-negative';
    if (status === 'PENDING') return 'pill-warning';
    return 'pill-neutral';
  }

  invoiceStatusLabel(status: string): string {
    return INVOICE_STATUS_LABEL[status] ?? status;
  }

  payButtonLabel(): string {
    return this.isBlocked() ? 'Regularizar pagamento' : 'Assinar agora';
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
