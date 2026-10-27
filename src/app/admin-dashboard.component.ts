import { Component, OnInit, inject, signal, computed, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { AdminService, TenantDTO, TenantUserDTO, PaymentMethod } from './admin.service';

const PLAN_LABELS: Record<string, string> = {
  starter: 'Starter',
  pro: 'Pro',
  enterprise: 'Enterprise',
  free: 'Cortesia',
};

const PLAN_MRR: Record<string, number> = {
  starter: 99,
  pro: 199,
  enterprise: 349,
  free: 0,
};

const PLAN_OPERATOR_LIMIT: Record<string, number> = {
  starter: 1,
  pro: 3,
  enterprise: 10,
  free: Number.POSITIVE_INFINITY,
};

const STATUS_LABEL: Record<string, string> = {
  PENDING_APPROVAL: 'Aguardando aprovação',
  REJECTED: 'Reprovado',
  ACTIVE: 'Ativo',
  BLOCKED: 'Bloqueado',
  CANCELLED: 'Cancelado',
};

const USER_ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  TENANT_ADMIN: 'Admin da loja',
  ADMIN: 'Administrador',
  OPERATOR: 'Operador',
};

@Component({
  selector: 'app-payment-method-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Confirmar ativação</h2>
    <mat-dialog-content>
      <p>Selecione o método de pagamento para ativar a assinatura de <strong>{{ tenantName }}</strong>:</p>
      <div class="payment-options">
        <label class="payment-option">
          <input type="radio" name="paymentMethod" value="CASH" [(ngModel)]="paymentMethod" />
          <span class="option-content">
            <span>Dinheiro</span>
          </span>
        </label>
        <label class="payment-option">
          <input type="radio" name="paymentMethod" value="PIX" [(ngModel)]="paymentMethod" />
          <span class="option-content">
            <span>Pix</span>
          </span>
        </label>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close(null)">Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!paymentMethod" (click)="dialogRef.close(paymentMethod)">
        Confirmar
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content { min-width: 300px; padding: 16px 0 !important; }
    .payment-options { display: flex; flex-direction: column; gap: 12px; margin-top: 16px; }
    .payment-option { display: flex; align-items: center; cursor: pointer; }
    .payment-option input { margin-right: 12px; }
    .option-content { display: flex; align-items: center; gap: 12px; flex: 1; height: 44px; padding: 0 14px; border: 1px solid var(--control); border-radius: var(--radius); transition: background-color 120ms var(--ease), border-color 120ms var(--ease); }
    .payment-option:hover .option-content { border-color: var(--primary); background: var(--primary-bg); }
    .payment-option input:checked + .option-content { border-color: var(--primary); background: var(--primary-bg); font-weight: 500; }
    .option-content mat-icon { font-size: 24px; width: 24px; height: 24px; }
  `]
})
export class PaymentMethodDialogComponent {
  paymentMethod: PaymentMethod | null = null;
  constructor(public dialogRef: MatDialogRef<PaymentMethodDialogComponent>, @Inject(MAT_DIALOG_DATA) public tenantName: string) {}
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatIconModule,
    MatButtonModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="admin">
      <header class="page-header">
        <div>
          <h1>Lojas</h1>
          <p class="header-subtitle">
            @if (loading() && tenants().length === 0) {
              Carregando as lojas da plataforma…
            } @else if (countByStatus('PENDING_APPROVAL') > 0) {
              {{ countByStatus('PENDING_APPROVAL') }} {{ countByStatus('PENDING_APPROVAL') === 1 ? 'loja espera' : 'lojas esperam' }} sua aprovação.
              A mais antiga pediu em {{ oldestPendingDate() | date:'dd/MM' }}.
            } @else {
              Nenhuma loja esperando aprovação.
            }
          </p>
        </div>
        <button mat-stroked-button (click)="load()" [disabled]="loading()">Atualizar</button>
      </header>

      <dl class="stats-strip">
        <div class="stat">
          <dt>Receita mensal estimada</dt>
          <dd class="lead">R$ {{ mrr() | number:'1.2-2' }}</dd>
        </div>
        <div class="stat">
          <dt>Lojas ativas</dt>
          <dd>{{ countByStatus('ACTIVE') }}</dd>
        </div>
        <div class="stat">
          <dt>Aguardando aprovação</dt>
          <dd [class.is-warning]="countByStatus('PENDING_APPROVAL') > 0">{{ countByStatus('PENDING_APPROVAL') }}</dd>
        </div>
        <div class="stat">
          <dt>Bloqueadas</dt>
          <dd [class.is-negative]="countByStatus('BLOCKED') > 0">{{ countByStatus('BLOCKED') }}</dd>
        </div>
        <div class="stat">
          <dt>Reprovadas</dt>
          <dd>{{ countByStatus('REJECTED') }}</dd>
        </div>
      </dl>

      <section class="table-card" aria-labelledby="tenants-title">
        <div class="panel-head">
          <h2 id="tenants-title">Todas as lojas</h2>
          <span class="aside">pendentes primeiro · receita estimada pelo plano de cada loja ativa</span>
        </div>

        @if (loading() && tenants().length === 0) {
          <div class="empty-state"><p>Carregando…</p></div>
        } @else if (tenants().length === 0) {
          <div class="empty-state"><p>Nenhuma loja cadastrada ainda. Os cadastros feitos no site aparecem aqui para aprovação.</p></div>
        } @else {
          <div class="table-wrapper">
            <table class="data-table">
              <thead>
                <tr>
                  <th scope="col">Loja</th>
                  <th scope="col">Plano</th>
                  <th scope="col">Situação</th>
                  <th scope="col" class="col-email">E-mail de cobrança</th>
                  <th scope="col" class="col-actions"><span class="sr-only">Ações</span></th>
                </tr>
              </thead>
              <tbody>
                <ng-container *ngFor="let t of sortedTenants()">
                  <tr [class.is-pending]="t.status === 'PENDING_APPROVAL'">
                    <td>
                      <span class="tenant-name">{{ t.name }}</span>
                      <span class="tenant-slug num">{{ t.slug }}</span>
                    </td>
                    <td>{{ planLabel(t.planId) }}</td>
                    <td>
                      <span class="pill" [ngClass]="statusPill(t.status)">{{ statusLabel(t.status) }}</span>
                      <small class="status-reason" *ngIf="t.blockReason && (t.status === 'REJECTED' || t.status === 'BLOCKED')">
                        {{ t.blockReason }}
                      </small>
                    </td>
                    <td class="col-email muted">{{ t.billingEmail }}</td>
                    <td class="col-actions">
                      <div class="actions">
                        <button mat-button (click)="toggleUsers(t)" [attr.aria-expanded]="expandedTenantId() === t.id">
                          {{ expandedTenantId() === t.id ? 'Ocultar usuários' : 'Usuários' }}
                        </button>
                        <button mat-stroked-button *ngIf="t.status === 'PENDING_APPROVAL'" (click)="reject(t)">Reprovar</button>
                        <button mat-flat-button color="primary" *ngIf="t.status === 'PENDING_APPROVAL'" (click)="approve(t)">Aprovar</button>
                        <button mat-flat-button color="primary" *ngIf="t.status === 'BLOCKED' || t.status === 'CANCELLED'" (click)="activate(t)">Registrar pagamento</button>
                        <button mat-stroked-button class="btn-block" *ngIf="t.status === 'ACTIVE'" (click)="block(t)">Bloquear</button>
                      </div>
                    </td>
                  </tr>
                  <tr *ngIf="expandedTenantId() === t.id" class="users-row">
                    <td colspan="5">
                      <div class="users-panel">
                        <div class="users-head">
                          <strong>Usuários de {{ t.name }}</strong>
                          <span class="pill num" [class.pill-negative]="isOverLimit(t.planId)" [class.pill-neutral]="!isOverLimit(t.planId)">
                            {{ operatorCount() }} de {{ operatorLimit(t.planId) === Infinity ? 'ilimitados' : operatorLimit(t.planId) }} operadores do plano
                          </span>
                        </div>
                        @if (usersLoading()) {
                          <p class="muted">Carregando…</p>
                        } @else if (tenantUsers().length === 0) {
                          <p class="muted">Nenhum usuário.</p>
                        } @else {
                          <ul class="users-list">
                            <li *ngFor="let u of tenantUsers()">
                              <span class="num">{{ u.username }}</span>
                              <span class="muted">{{ roleLabel(u.role) }}</span>
                            </li>
                          </ul>
                        }
                      </div>
                    </td>
                  </tr>
                </ng-container>
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .admin {
      max-width: 1360px;
      margin: 0 auto;
    }
    .table-card {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: hidden;
    }
    .table-wrapper {
      overflow-x: auto;
    }
    .tenant-name {
      display: block;
      font-weight: 500;
    }
    .tenant-slug {
      display: block;
      color: var(--text-secondary);
      font-size: 12px;
    }
    .status-reason {
      display: block;
      max-width: 240px;
      margin-top: 4px;
      color: var(--text-secondary);
      font-size: 12px;
      line-height: 16px;
    }
    .col-actions {
      text-align: right;
    }
    .actions {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      justify-content: flex-end;
      flex-wrap: wrap;
    }
    .btn-block:hover:not(:disabled) {
      color: var(--danger) !important;
      border-color: var(--danger) !important;
    }
    .users-row td {
      padding: 0 !important;
      background: var(--surface-alt);
    }
    .users-row:hover {
      background: transparent !important;
    }
    .users-panel {
      padding: 12px 20px 16px;
    }
    .users-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 8px;
    }
    .users-head strong {
      font-weight: 500;
    }
    .users-list {
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .users-list li {
      display: flex;
      justify-content: space-between;
      min-height: 36px;
      align-items: center;
      border-bottom: 1px solid var(--border-light);
    }
    .users-list li:last-child {
      border-bottom: 0;
    }
    @media (max-width: 900px) {
      .col-email {
        display: none;
      }
    }
  `]
})
export class AdminDashboardComponent implements OnInit {
  private adminService = inject(AdminService);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  tenants = signal<TenantDTO[]>([]);
  loading = signal(false);
  expandedTenantId = signal<string | null>(null);
  tenantUsers = signal<TenantUserDTO[]>([]);
  usersLoading = signal(false);

  readonly Infinity = Number.POSITIVE_INFINITY;

  sortedTenants = computed(() => {
    const order: Record<string, number> = { PENDING_APPROVAL: 0, BLOCKED: 1, ACTIVE: 2, CANCELLED: 3, REJECTED: 4 };
    return [...this.tenants()].sort((a, b) =>
      (order[a.status] ?? 9) - (order[b.status] ?? 9) || a.name.localeCompare(b.name, 'pt-BR'));
  });

  oldestPendingDate = computed(() => {
    const dates = this.tenants()
      .filter(t => t.status === 'PENDING_APPROVAL')
      .map(t => (t as TenantDTO & { createdAt?: string }).createdAt)
      .filter((d): d is string => !!d)
      .sort();
    return dates[0] ?? null;
  });

  mrr = computed(() =>
    this.tenants()
      .filter(t => t.status === 'ACTIVE')
      .reduce((sum, t) => sum + (PLAN_MRR[t.planId] ?? 0), 0)
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.expandedTenantId.set(null);
    this.tenantUsers.set([]);
    this.adminService.getTenants().subscribe({
      next: (data) => {
        this.tenants.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erro ao carregar tenants.', 'OK', { duration: 4000 });
      }
    });
  }

  approve(t: TenantDTO): void {
    this.adminService.approveTenant(t.id).subscribe({
      next: () => {
        this.snackBar.open(`Tenant "${t.name}" aprovado. Credenciais enviadas por e-mail.`, 'OK', { duration: 5000 });
        this.load();
      },
      error: () => this.snackBar.open('Erro ao aprovar tenant.', 'OK', { duration: 4000 })
    });
  }

  reject(t: TenantDTO): void {
    const reason = window.prompt(`Motivo da reprovação de "${t.name}":`);
    if (!reason?.trim()) {
      return;
    }
    this.adminService.rejectTenant(t.id, reason.trim()).subscribe({
      next: () => {
        this.snackBar.open(`Solicitação de "${t.name}" reprovada.`, 'OK', { duration: 4000 });
        this.load();
      },
      error: () => this.snackBar.open('Erro ao reprovar solicitação.', 'OK', { duration: 4000 })
    });
  }

  block(t: TenantDTO): void {
    const reason = window.prompt(`Motivo do bloqueio de "${t.name}":`, 'Inadimplência');
    if (!reason) {
      return;
    }
    this.adminService.blockTenant(t.id, reason).subscribe({
      next: () => {
        this.snackBar.open(`Tenant "${t.name}" bloqueado.`, 'OK', { duration: 4000 });
        this.load();
      },
      error: () => this.snackBar.open('Erro ao bloquear tenant.', 'OK', { duration: 4000 })
    });
  }

  activate(t: TenantDTO): void {
    const dialogRef = this.dialog.open(PaymentMethodDialogComponent, {
      data: t.name,
      width: '400px',
    });
    dialogRef.afterClosed().subscribe((paymentMethod: PaymentMethod | null) => {
      if (!paymentMethod) {
        return;
      }
      this.adminService.activateTenant(t.id, paymentMethod).subscribe({
        next: () => {
          this.snackBar.open(`Assinatura de "${t.name}" ativada via ${paymentMethod}.`, 'OK', { duration: 4000 });
          this.load();
        },
        error: () => this.snackBar.open('Erro ao ativar assinatura.', 'OK', { duration: 4000 })
      });
    });
  }

  countByStatus(status: string): number {
    return this.tenants().filter(t => t.status === status).length;
  }

  planLabel(planId: string): string {
    return PLAN_LABELS[planId] ?? planId;
  }

  statusPill(status: string): string {
    if (status === 'ACTIVE') return 'pill-positive';
    if (status === 'PENDING_APPROVAL') return 'pill-warning';
    if (status === 'BLOCKED') return 'pill-negative';
    return 'pill-neutral';
  }

  statusLabel(status: string): string {
    return STATUS_LABEL[status] ?? status;
  }

  roleLabel(role: string): string {
    return USER_ROLE_LABEL[role] ?? role;
  }

  operatorLimit(planId: string): number {
    return PLAN_OPERATOR_LIMIT[planId] ?? 0;
  }

  isOverLimit(planId: string): boolean {
    return this.operatorCount() > this.operatorLimit(planId);
  }

  operatorCount(): number {
    return this.tenantUsers().filter(user => user.role === 'OPERATOR').length;
  }

  toggleUsers(t: TenantDTO): void {
    if (this.expandedTenantId() === t.id) {
      this.expandedTenantId.set(null);
      this.tenantUsers.set([]);
      return;
    }
    this.expandedTenantId.set(t.id);
    this.tenantUsers.set([]);
    this.usersLoading.set(true);
    this.adminService.getTenantUsers(t.id).subscribe({
      next: (users) => {
        this.tenantUsers.set(users);
        this.usersLoading.set(false);
      },
      error: () => {
        this.usersLoading.set(false);
        this.snackBar.open('Erro ao carregar usuários do tenant.', 'OK', { duration: 4000 });
      }
    });
  }
}
