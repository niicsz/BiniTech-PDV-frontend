import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { CashSessionService } from '../pos/services/cash-session.service';
import { AuthService } from '../auth/services/auth.service';
import { CashSessionDTO, PaymentMethodEnum } from '../shared/models/api.models';
import { buildCashSessionReport, printMatrix } from '../shared/receipt/matrix-receipt';
import { localIsoDate } from '../core/local-date';

const METHOD_LABELS: Record<PaymentMethodEnum, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  PIX: 'PIX',
  CREDIARIO: 'Crediário',
};

@Component({
  selector: 'app-cash-sessions',
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Caixas</h1>
          <p>{{ isAdmin ? 'Aberturas, sangrias e fechamentos de todos os operadores.' : 'Seus turnos de caixa.' }}</p>
        </div>
        <form class="filters" (ngSubmit)="load()">
          <mat-form-field appearance="outline">
            <mat-label>De</mat-label>
            <input matInput type="date" name="start" [(ngModel)]="startDate" required />
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Até</mat-label>
            <input matInput type="date" name="end" [(ngModel)]="endDate" required />
          </mat-form-field>
          <button mat-flat-button color="primary" type="submit" [disabled]="loading">
            <mat-icon>search</mat-icon> Buscar
          </button>
        </form>
      </header>

      <p class="error" *ngIf="error" role="alert">{{ error }}</p>

      <div class="totals" *ngIf="sessions.length > 0">
        <div class="tile"><span>Turnos</span><strong>{{ sessions.length }}</strong></div>
        <div class="tile"><span>Vendido</span><strong>R$ {{ totalSold() | number: '1.2-2' }}</strong></div>
        <div class="tile"><span>Sangrias</span><strong>R$ {{ totalWithdrawals() | number: '1.2-2' }}</strong></div>
        <div class="tile" [class.short]="totalDifference() < 0" [class.over]="totalDifference() > 0">
          <span>Diferença</span><strong>R$ {{ totalDifference() | number: '1.2-2' }}</strong>
        </div>
      </div>

      <div class="empty" *ngIf="!loading && sessions.length === 0">
        <mat-icon>point_of_sale</mat-icon>
        <p>Nenhum caixa aberto nesse período.</p>
      </div>

      <div class="table-wrap" *ngIf="sessions.length > 0">
        <table>
          <thead>
            <tr>
              <th>Operador</th>
              <th>Abertura</th>
              <th>Fechamento</th>
              <th class="num">Vendido</th>
              <th class="num">Esperado</th>
              <th class="num">Contado</th>
              <th class="num">Diferença</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let session of sessions" (click)="selected = session" tabindex="0" (keydown.enter)="selected = session">
              <td>{{ session.operatorName || '—' }}</td>
              <td>{{ session.openedAt | date: 'dd/MM HH:mm' }}</td>
              <td>
                <span *ngIf="session.status === 'CLOSED'; else openTag">{{ session.closedAt | date: 'dd/MM HH:mm' }}</span>
                <ng-template #openTag><span class="tag open">Aberto</span></ng-template>
              </td>
              <td class="num">R$ {{ session.summary?.salesTotal ?? 0 | number: '1.2-2' }}</td>
              <td class="num">R$ {{ session.summary?.expectedCash ?? 0 | number: '1.2-2' }}</td>
              <td class="num">{{ session.countedAmount === null || session.countedAmount === undefined ? '—' : ('R$ ' + (session.countedAmount | number: '1.2-2')) }}</td>
              <td class="num" [class.short]="(session.difference ?? 0) < 0" [class.over]="(session.difference ?? 0) > 0">
                {{ session.difference === null || session.difference === undefined ? '—' : ('R$ ' + (session.difference | number: '1.2-2')) }}
              </td>
              <td><mat-icon class="chevron">chevron_right</mat-icon></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="modal-overlay" *ngIf="selected" (click)="selected = null">
      <mat-card class="modal-content" appearance="outlined" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <mat-icon>point_of_sale</mat-icon>
          <h3>Caixa de {{ selected.operatorName || 'operador' }}</h3>
        </div>
        <p class="meta">
          Aberto em {{ selected.openedAt | date: 'dd/MM/yyyy HH:mm' }}
          <ng-container *ngIf="selected.closedAt"> · fechado em {{ selected.closedAt | date: 'dd/MM/yyyy HH:mm' }}</ng-container>
        </p>
        <div class="summary">
          <div class="line"><span>Vendas</span><strong>{{ selected.summary?.salesCount ?? 0 }}</strong></div>
          <div class="line"><span>Total vendido</span><strong>R$ {{ selected.summary?.salesTotal ?? 0 | number: '1.2-2' }}</strong></div>
          <div class="line sub" *ngIf="(selected.summary?.discountTotal ?? 0) > 0"><span>Descontos</span><span>- R$ {{ selected.summary?.discountTotal | number: '1.2-2' }}</span></div>
          <div class="line sub" *ngIf="(selected.summary?.surchargeTotal ?? 0) > 0"><span>Acréscimos</span><span>+ R$ {{ selected.summary?.surchargeTotal | number: '1.2-2' }}</span></div>
          <div class="line sub" *ngFor="let entry of selected.summary?.receivedByMethod ?? []">
            <span>{{ methodLabel(entry.method) }}</span><span>R$ {{ entry.amount | number: '1.2-2' }}</span>
          </div>
          <div class="line divider"><span>Troco inicial</span><span>R$ {{ selected.openingAmount | number: '1.2-2' }}</span></div>
          <div class="line sub"><span>Suprimentos</span><span>+ R$ {{ selected.summary?.supplies ?? 0 | number: '1.2-2' }}</span></div>
          <div class="line sub"><span>Sangrias</span><span>- R$ {{ selected.summary?.withdrawals ?? 0 | number: '1.2-2' }}</span></div>
          <div class="line sub" *ngIf="(selected.summary?.cashRefunds ?? 0) > 0"><span>Devoluções em dinheiro</span><span>- R$ {{ selected.summary?.cashRefunds | number: '1.2-2' }}</span></div>
          <div class="line total"><span>Dinheiro esperado</span><strong>R$ {{ selected.summary?.expectedCash ?? 0 | number: '1.2-2' }}</strong></div>
          <div class="line" *ngIf="selected.countedAmount !== null && selected.countedAmount !== undefined">
            <span>Dinheiro contado</span><strong>R$ {{ selected.countedAmount | number: '1.2-2' }}</strong>
          </div>
        </div>
        <div class="movements" *ngIf="selected.movements.length > 0">
          <h4>Movimentos</h4>
          <div class="movement" *ngFor="let movement of selected.movements">
            <span>{{ movement.timestamp | date: 'HH:mm' }}</span>
            <span class="kind">{{ movement.type === 'WITHDRAWAL' ? 'Sangria' : 'Suprimento' }}</span>
            <span class="reason">{{ movement.reason || '' }}</span>
            <strong>{{ movement.type === 'WITHDRAWAL' ? '-' : '+' }} R$ {{ movement.amount | number: '1.2-2' }}</strong>
          </div>
        </div>
        <p class="notes" *ngIf="selected.notes">Obs.: {{ selected.notes }}</p>
        <div class="actions">
          <button mat-stroked-button type="button" (click)="print(selected)"><mat-icon>print</mat-icon> Imprimir</button>
          <button mat-flat-button color="primary" type="button" (click)="selected = null">Fechar</button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; flex-wrap: wrap; margin-bottom: 16px; }
    h1 { margin: 0; font-size: 24px; color: var(--text); }
    .page-header p { margin: 4px 0 0; color: var(--text-secondary); }
    .filters { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
    .filters mat-form-field { width: 160px; }
    .error { color: var(--danger); }
    .totals { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; margin-bottom: 16px; }
    .tile { padding: 14px 16px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); display: flex; flex-direction: column; gap: 4px; }
    .tile span { color: var(--text-secondary); font-size: 13px; }
    .tile strong { font-size: 20px; font-family: var(--font-mono); color: var(--text); }
    .short, .tile.short strong { color: var(--danger) !important; }
    .over, .tile.over strong { color: #b7791f !important; }
    .empty { text-align: center; padding: 48px 16px; color: var(--text-secondary); }
    .empty mat-icon { font-size: 40px; width: 40px; height: 40px; }
    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    th, td { padding: 10px 12px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; color: var(--text); }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: 0.4px; color: var(--text-secondary); }
    .num { text-align: right; font-family: var(--font-mono); }
    tbody tr { cursor: pointer; }
    tbody tr:hover, tbody tr:focus { background: var(--surface-alt); outline: none; }
    .tag.open { padding: 2px 8px; border-radius: 999px; background: var(--success-bg); color: var(--success); font-size: 12px; font-weight: 600; }
    .chevron { color: var(--text-secondary); }
    .modal-overlay { position: fixed; inset: 0; z-index: 1000; background: rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; padding: 16px; }
    .modal-content { width: 480px; max-width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; }
    .modal-header { display: flex; align-items: center; gap: 10px; }
    .modal-header h3 { margin: 0; font-size: 20px; }
    .modal-header mat-icon { color: var(--primary); }
    .meta { color: var(--text-secondary); font-size: 13px; margin: 6px 0 12px; }
    .summary { padding: 12px 14px; background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius); }
    .line { display: flex; justify-content: space-between; padding: 3px 0; font-size: 14px; }
    .line.sub { padding-left: 12px; color: var(--text-secondary); font-size: 13px; }
    .line.divider { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
    .line.total { margin-top: 6px; padding-top: 6px; border-top: 2px solid var(--border); }
    .movements { margin-top: 14px; }
    .movements h4 { margin: 0 0 6px; font-size: 12px; text-transform: uppercase; color: var(--text-secondary); }
    .movement { display: grid; grid-template-columns: 48px 90px 1fr auto; gap: 8px; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
    .movement .reason { color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .notes { font-size: 13px; color: var(--text-secondary); }
    .actions { display: flex; justify-content: flex-end; gap: 8px; margin-top: 16px; }
    @media (max-width: 600px) {
      .page { padding: 16px; }
      .filters mat-form-field { width: calc(50% - 4px); }
    }
  `],
})
export class CashSessionsComponent implements OnInit {
  private readonly service = inject(CashSessionService);
  private readonly authService = inject(AuthService);

  readonly isAdmin = this.authService.canManageTenantUsers();
  startDate = localIsoDate();
  endDate = localIsoDate();
  sessions: CashSessionDTO[] = [];
  selected: CashSessionDTO | null = null;
  loading = false;
  error = '';

  ngOnInit(): void {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    this.startDate = localIsoDate(start);
    this.load();
  }

  load(): void {
    this.loading = true;
    this.error = '';
    this.service.list(this.startDate, this.endDate).subscribe({
      next: (sessions) => {
        this.loading = false;
        this.sessions = sessions;
      },
      error: (err) => {
        this.loading = false;
        this.sessions = [];
        this.error = err.error?.message || 'Não foi possível carregar os caixas.';
      },
    });
  }

  totalSold(): number {
    return this.sum((s) => s.summary?.salesTotal ?? 0);
  }

  totalWithdrawals(): number {
    return this.sum((s) => s.summary?.withdrawals ?? 0);
  }

  totalDifference(): number {
    return this.sum((s) => s.difference ?? 0);
  }

  methodLabel(method: PaymentMethodEnum): string {
    return METHOD_LABELS[method] ?? method;
  }

  print(session: CashSessionDTO): void {
    printMatrix(buildCashSessionReport(session), 'Fechamento de caixa');
  }

  private sum(value: (session: CashSessionDTO) => number): number {
    return Math.round(this.sessions.reduce((total, session) => total + value(session), 0) * 100) / 100;
  }
}
