import { Component, OnInit, inject, signal, computed, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
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
  PENDING_APPROVAL: 'Aguardando',
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
            <mat-icon>payments</mat-icon>
            <span>Dinheiro (CASH)</span>
          </span>
        </label>
        <label class="payment-option">
          <input type="radio" name="paymentMethod" value="PIX" [(ngModel)]="paymentMethod" />
          <span class="option-content">
            <mat-icon>qr_code</mat-icon>
            <span>PIX</span>
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
    .option-content { display: flex; align-items: center; gap: 12px; padding: 12px 16px; border: 2px solid var(--border); border-radius: var(--radius); transition: all 0.2s; }
    .payment-option:hover .option-content { border-color: var(--primary); background: var(--primary-bg); }
    .payment-option input:checked + .option-content { border-color: var(--primary); background: var(--primary-bg); color: var(--primary-dark); }
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
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="admin">
      <header class="admin-head">
        <div>
          <a routerLink="/pdv" class="back">← Voltar ao PDV</a>
          <h1>Painel do Super Admin</h1>
        </div>
        <button mat-stroked-button (click)="load()"><mat-icon>refresh</mat-icon> Atualizar</button>
      </header>

      <section class="stats">
        <div class="stat"><span class="num">{{ tenants().length }}</span><span class="lbl">Tenants</span></div>
        <div class="stat"><span class="num">{{ countByStatus('ACTIVE') }}</span><span class="lbl">Ativos</span></div>
        <div class="stat"><span class="num">{{ countByStatus('PENDING_APPROVAL') }}</span><span class="lbl">Aguardando</span></div>
        <div class="stat"><span class="num">{{ countByStatus('REJECTED') }}</span><span class="lbl">Reprovados</span></div>
        <div class="stat highlight"><span class="num">R$ {{ mrr() }}</span><span class="lbl">MRR estimado</span></div>
      </section>

      <div *ngIf="loading()" class="loading"><mat-spinner diameter="32"></mat-spinner></div>

      <table *ngIf="!loading()" class="tenant-table">
        <thead>
          <tr><th>Empresa</th><th>Slug</th><th>Plano</th><th>Status</th><th>E-mail</th><th>Ações</th></tr>
        </thead>
        <tbody>
          <ng-container *ngFor="let t of tenants()">
            <tr>
              <td>{{ t.name }}</td>
              <td><code>{{ t.slug }}</code></td>
              <td>{{ planLabel(t.planId) }}</td>
              <td>
                <span class="badge" [class]="'st-' + t.status">{{ statusLabel(t.status) }}</span>
                <small class="status-reason" *ngIf="t.status === 'REJECTED' && t.blockReason">
                  {{ t.blockReason }}
                </small>
              </td>
              <td>{{ t.billingEmail }}</td>
              <td class="actions">
                <button mat-button (click)="toggleUsers(t)">
                  <mat-icon>{{ expandedTenantId() === t.id ? 'expand_less' : 'group' }}</mat-icon>
                  Usuários
                </button>
                <button mat-flat-button color="primary" *ngIf="t.status === 'PENDING_APPROVAL'"
                        (click)="approve(t)">Aprovar</button>
                <button mat-stroked-button color="warn" *ngIf="t.status === 'PENDING_APPROVAL'"
                        (click)="reject(t)">Reprovar</button>
                <button mat-flat-button color="primary" *ngIf="t.status === 'BLOCKED' || t.status === 'CANCELLED'"
                        (click)="activate(t)">Ativar pagamento</button>
                <button mat-stroked-button color="warn" *ngIf="t.status === 'ACTIVE'"
                        (click)="block(t)">Bloquear</button>
              </td>
            </tr>
            <tr *ngIf="expandedTenantId() === t.id" class="users-row">
              <td colspan="6">
                <div class="users-panel">
                  <div class="users-head">
                    <strong>Usuários do tenant</strong>
                    <span class="limit-chip" [class.over]="isOverLimit(t.planId)">
                      {{ operatorCount() }} / {{ operatorLimit(t.planId) }} operadores do plano
                    </span>
                  </div>
                  <div *ngIf="usersLoading()" class="users-loading"><mat-spinner diameter="22"></mat-spinner></div>
                  <table *ngIf="!usersLoading()" class="users-table">
                    <thead><tr><th>Usuário</th><th>Perfil</th></tr></thead>
                    <tbody>
                      <tr *ngFor="let u of tenantUsers()">
                        <td>{{ u.username }}</td>
                        <td><span class="role-badge">{{ roleLabel(u.role) }}</span></td>
                      </tr>
                      <tr *ngIf="tenantUsers().length === 0"><td colspan="2" class="empty">Nenhum usuário.</td></tr>
                    </tbody>
                  </table>
                </div>
              </td>
            </tr>
          </ng-container>
          <tr *ngIf="tenants().length === 0"><td colspan="6" class="empty">Nenhum tenant cadastrado.</td></tr>
        </tbody>
      </table>
    </div>
  `,
  styles: [`
    .admin { max-width:1100px; margin:0 auto; padding:40px 24px; }
    .admin-head { display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:28px; }
    .back { color:var(--primary-dark); text-decoration:none; font-size:13px; font-weight:600; }
    .back:hover { text-decoration:underline; }
    h1 { font-family:var(--font-display); margin:8px 0 0; font-size:34px; font-weight:800; letter-spacing:-1px; color:var(--text); }
    .stats { display:flex; gap:16px; margin-bottom:30px; flex-wrap:wrap; }
    .stat { background:var(--surface); border:2px solid var(--text); border-radius:var(--radius-md); padding:18px 24px;
      min-width:150px; display:flex; flex-direction:column; gap:4px; box-shadow:5px 5px 0 var(--text); }
    .stat .num { font-family:var(--font-display); font-size:30px; font-weight:800; letter-spacing:-1px; color:var(--text); }
    .stat .lbl { font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:.6px; color:var(--text-secondary); }
    .stat.highlight { background:var(--primary); border-color:var(--text); color:#fff; }
    .stat.highlight .num { color:#fff; }
    .stat.highlight .lbl { color:#ffe1d7; }
    .loading { display:flex; justify-content:center; padding:40px; }
    .tenant-table { width:100%; border-collapse:separate; border-spacing:0; background:var(--surface);
      border:2px solid var(--text); border-radius:var(--radius-md); overflow:hidden; box-shadow:6px 6px 0 var(--text); }
    th, td { text-align:left; padding:12px 16px; border-bottom:1.5px solid var(--border); font-size:14px; color:var(--text); }
    th { background:var(--table-header-bg); color:var(--table-header-text); font-weight:700; font-family:var(--font-mono);
      font-size:11.5px; text-transform:uppercase; letter-spacing:.6px; }
    code { font-family:var(--font-mono); background:var(--surface-alt); padding:2px 6px; border-radius:var(--radius-sm); font-size:12px; }
    .badge { padding:3px 10px; border-radius:100px; font-size:11.5px; font-weight:700; font-family:var(--font-mono); border:1.5px solid currentColor; }
    .st-ACTIVE { background:var(--success-bg); color:var(--success); }
    .st-PENDING_APPROVAL { background:var(--warning-bg); color:var(--accent); }
    .st-REJECTED { background:var(--danger-bg); color:var(--danger); }
    .st-BLOCKED { background:var(--danger-bg); color:var(--danger); }
    .st-CANCELLED { background:var(--surface-alt); color:var(--text-secondary); }
    .actions { display:flex; gap:8px; align-items:center; }
    .status-reason { display:block; max-width:180px; margin-top:6px; color:var(--text-secondary); line-height:1.3; }
    .empty { text-align:center; color:var(--text-tertiary); padding:32px; }
    .users-row td { background:var(--surface-alt); padding:0; }
    .users-panel { padding:16px 20px; }
    .users-head { display:flex; align-items:center; justify-content:space-between; margin-bottom:12px; }
    .users-head strong { font-family:var(--font-display); }
    .limit-chip { background:var(--primary-bg); color:var(--primary-dark); padding:4px 12px; border-radius:100px;
      font-family:var(--font-mono); font-size:11.5px; font-weight:600; border:1.5px solid var(--primary); }
    .limit-chip.over { background:var(--danger-bg); color:var(--danger); border-color:var(--danger); }
    .users-loading { display:flex; justify-content:center; padding:16px; }
    .users-table { width:100%; border-collapse:separate; border-spacing:0; background:var(--surface);
      border:1.5px solid var(--border); border-radius:var(--radius); overflow:hidden; }
    .users-table th, .users-table td { text-align:left; padding:8px 14px; border-bottom:1.5px solid var(--border); font-size:13px; }
    .users-table th { background:var(--table-header-bg); color:var(--table-header-text); font-weight:700; }
    .role-badge { background:var(--surface-alt); color:var(--text); padding:2px 10px; border-radius:100px;
      font-family:var(--font-mono); font-size:11.5px; font-weight:600; }
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
