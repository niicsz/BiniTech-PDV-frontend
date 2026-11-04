import { Component, EventEmitter, OnInit, Output, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { BillingService, PlanOptionDTO, PlanOverviewDTO } from './billing.service';
import { AuthService } from './auth/services/auth.service';

const PLAN_NAMES: Record<string, string> = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };

interface Pending {
  kind: 'plan' | 'users';
  planId?: string;
  quantity?: number;
  monthly: number;
  title: string;
}

@Component({
  selector: 'app-plan-picker',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule, MatSnackBarModule],
  template: `
    @if (overview(); as o) {
      @if (o.currentPlan !== 'free') {
        <section class="card">
          <h2>Plano e usuários</h2>

          <div class="plans">
            @for (plan of o.plans; track plan.id) {
              <article class="plan" [class.current]="plan.id === o.currentPlan">
                <header>
                  <span class="name">{{ name(plan.id) }}</span>
                  @if (plan.id === o.currentPlan) { <span class="tag">Seu plano</span> }
                </header>
                <p class="price">R$ {{ plan.price | number:'1.2-2' }}<small>/mês</small></p>
                <ul>
                  <li>{{ plan.maxOperators }} {{ plan.maxOperators === 1 ? 'operador' : 'operadores' }}</li>
                  <li>{{ plan.maxSalesPerMonth === null ? 'Vendas ilimitadas' : 'Até ' + (plan.maxSalesPerMonth | number) + ' vendas/mês' }}</li>
                  <li>{{ plan.maxProducts === null ? 'Produtos ilimitados' : 'Até ' + (plan.maxProducts | number) + ' produtos' }}</li>
                </ul>
                @if (plan.id !== o.currentPlan && canManage) {
                  <button mat-stroked-button type="button" (click)="askPlan(plan, o)" [disabled]="saving()">
                    {{ isUpgrade(plan, o) ? 'Fazer upgrade' : 'Mudar para ' + name(plan.id) }}
                  </button>
                }
              </article>
            }
          </div>

          <div class="users">
            <div>
              <strong>Usuários adicionais</strong>
              <p>
                Você usa {{ o.operatorsInUse }} de {{ o.operatorLimit }} operador(es) de caixa; o administrador não conta.
                Cada usuário além do plano custa R$ {{ o.extraUserPrice | number:'1.2-2' }}/mês e entra na mesma fatura.
              </p>
            </div>
            <div class="stepper" [class.locked]="!canManage">
              <button type="button" (click)="draftUsers.set(draftUsers() - 1)" [disabled]="!canManage || draftUsers() <= minUsers()" aria-label="Menos um usuário">−</button>
              <span aria-live="polite">{{ draftUsers() }}</span>
              <button type="button" (click)="draftUsers.set(draftUsers() + 1)" [disabled]="!canManage || draftUsers() >= 50" aria-label="Mais um usuário">+</button>
            </div>
            @if (canManage && draftUsers() !== o.extraUsers) {
              <button mat-flat-button color="primary" type="button" (click)="askUsers(o)" [disabled]="saving()">
                {{ draftUsers() > o.extraUsers ? 'Contratar' : 'Reduzir' }}
              </button>
            }
          </div>

          <p class="total">Total mensal: <strong>R$ {{ o.monthlyAmount | number:'1.2-2' }}</strong></p>
          <p class="hint">Vendas ilimitadas em todos os planos. No limite de produtos, inative os que não vende mais ou mude de plano; não há cobrança por produto a mais.</p>
          @if (!canManage) { <p class="hint">Só o administrador da loja muda o plano.</p> }

          @if (pending(); as p) {
            <div class="confirm" role="alertdialog" aria-labelledby="confirm-title">
              <strong id="confirm-title">{{ p.title }}</strong>
              <p>
                Novo total mensal: <b>R$ {{ p.monthly | number:'1.2-2' }}</b>.
                Os novos limites valem na hora.
                @if (o.recurringCard) {
                  O valor da assinatura no cartão muda a partir da próxima cobrança.
                } @else {
                  O novo valor vale a partir do próximo pagamento.
                }
              </p>
              <div class="row">
                <button mat-stroked-button type="button" (click)="pending.set(null)" [disabled]="saving()">Voltar</button>
                <button mat-flat-button color="primary" type="button" (click)="confirm(p)" [disabled]="saving()">Confirmar</button>
              </div>
            </div>
          }
        </section>
      }
    }
  `,
  styles: [`
    .card { background:var(--surface); border:2px solid var(--text); border-radius:var(--radius-md); padding:26px;
      box-shadow:6px 6px 0 var(--shadow-hard-color); margin-bottom:22px; }
    h2 { font-family:var(--font-display); font-size:20px; font-weight:700; margin:0 0 16px; color:var(--text); }
    .plans { display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:12px; }
    .plan { border:1.5px solid var(--border); border-radius:var(--radius-md); padding:16px; display:flex; flex-direction:column; gap:8px; }
    .plan.current { border:2px solid var(--primary); background:var(--primary-bg); }
    .plan header { display:flex; justify-content:space-between; align-items:center; gap:6px; }
    .name { font-family:var(--font-mono); font-size:12px; text-transform:uppercase; letter-spacing:.6px; color:var(--text-secondary); font-weight:700; }
    .tag { font-family:var(--font-mono); font-size:10.5px; font-weight:700; color:var(--primary-text); border:1.5px solid currentColor; border-radius:100px; padding:2px 8px; }
    .price { font-family:var(--font-display); font-size:24px; font-weight:800; margin:0; color:var(--text); font-variant-numeric:tabular-nums; }
    .price small { font-family:var(--font-mono); font-size:12px; font-weight:500; color:var(--text-tertiary); margin-left:3px; }
    .plan ul { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:3px; font-size:13.5px; color:var(--text-secondary); flex:1; }
    .plan button { margin-top:6px; }
    .users { display:flex; align-items:center; gap:16px; flex-wrap:wrap; margin-top:20px; padding-top:18px; border-top:2px dashed var(--border); }
    .users > div:first-child { flex:1; min-width:220px; }
    .users strong { color:var(--text); }
    .users p { margin:4px 0 0; font-size:13.5px; color:var(--text-secondary); }
    .stepper { display:inline-flex; align-items:center; border:1.5px solid var(--text); border-radius:100px; overflow:hidden; }
    .stepper button { width:38px; height:38px; border:none; background:var(--surface); color:var(--text); font-size:20px; cursor:pointer; }
    .stepper button:disabled { opacity:.35; cursor:not-allowed; }
    .stepper span { min-width:34px; text-align:center; font-weight:800; font-variant-numeric:tabular-nums; color:var(--text); }
    .total { margin:18px 0 0; color:var(--text-secondary); }
    .total strong { color:var(--text); font-size:18px; }
    .hint { font-size:13px; color:var(--text-tertiary); margin:6px 0 0; }
    .confirm { margin-top:16px; padding:16px; border:1.5px solid var(--accent); background:var(--warning-bg); border-radius:var(--radius-md); color:var(--text); }
    .confirm p { margin:6px 0 12px; font-size:14px; color:var(--text-secondary); }
    .confirm .row { display:flex; justify-content:flex-end; gap:8px; }
    @media (max-width: 640px) { .plans { grid-template-columns:1fr; } }
  `],
})
export class PlanPickerComponent implements OnInit {
  @Output() changed = new EventEmitter<PlanOverviewDTO>();
  @Output() loaded = new EventEmitter<PlanOverviewDTO>();

  private readonly billingService = inject(BillingService);
  private readonly snackBar = inject(MatSnackBar);
  readonly canManage = inject(AuthService).canManageTenantUsers();

  overview = signal<PlanOverviewDTO | null>(null);
  draftUsers = signal(0);
  pending = signal<Pending | null>(null);
  saving = signal(false);

  minUsers = computed(() => {
    const o = this.overview();
    if (!o || o.operatorLimit === null) return 0;
    const planOperators = o.operatorLimit - o.extraUsers;
    return Math.max(0, o.operatorsInUse - planOperators);
  });

  ngOnInit(): void {
    this.billingService.getPlan().subscribe({
      next: (overview) => {
        this.apply(overview);
        this.loaded.emit(overview);
      },
      error: () => {},
    });
  }

  name(id: string): string {
    return PLAN_NAMES[id] ?? id;
  }

  isUpgrade(plan: PlanOptionDTO, o: PlanOverviewDTO): boolean {
    const current = o.plans.find((p) => p.id === o.currentPlan);
    return !current || plan.price > current.price;
  }

  askPlan(plan: PlanOptionDTO, o: PlanOverviewDTO): void {
    this.pending.set({
      kind: 'plan',
      planId: plan.id,
      monthly: plan.price + o.extraUsers * o.extraUserPrice,
      title: `${this.isUpgrade(plan, o) ? 'Fazer upgrade' : 'Mudar'} para o plano ${this.name(plan.id)}?`,
    });
  }

  askUsers(o: PlanOverviewDTO): void {
    const quantity = this.draftUsers();
    const base = o.plans.find((p) => p.id === o.currentPlan)?.price ?? 0;
    this.pending.set({
      kind: 'users',
      quantity,
      monthly: base + quantity * o.extraUserPrice,
      title:
        quantity > o.extraUsers
          ? `Contratar ${quantity - o.extraUsers} usuário(s) adicional(is)?`
          : `Ficar com ${quantity} usuário(s) adicional(is)?`,
    });
  }

  confirm(p: Pending): void {
    this.saving.set(true);
    const request =
      p.kind === 'plan'
        ? this.billingService.changePlan(p.planId!)
        : this.billingService.setExtraUsers(p.quantity!);
    request.subscribe({
      next: (overview) => {
        this.saving.set(false);
        this.pending.set(null);
        this.apply(overview);
        this.changed.emit(overview);
        this.snackBar.open(
          p.kind === 'plan' ? `Plano alterado para ${this.name(overview.currentPlan)}.` : 'Usuários adicionais atualizados.',
          'OK',
          { duration: 4000 },
        );
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.snackBar.open(error.error?.message || 'Não foi possível alterar agora.', 'OK', { duration: 7000 });
      },
    });
  }

  private apply(overview: PlanOverviewDTO): void {
    this.overview.set(overview);
    this.draftUsers.set(overview.extraUsers);
  }
}
