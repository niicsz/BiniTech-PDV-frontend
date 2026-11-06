import { Component, ElementRef, EventEmitter, HostListener, OnInit, Output, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { CashMovementType, CashSessionDTO, PaymentMethodEnum } from '../../../shared/models/api.models';
import { CashSessionService } from '../../services/cash-session.service';
import { AuthService } from '../../../auth/services/auth.service';
import { buildCashSessionReport, printMatrix } from '../../../shared/receipt/matrix-receipt';

type CashDialog = 'open' | 'movement' | 'close' | 'closed' | null;

const METHOD_LABELS: Record<PaymentMethodEnum, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Crédito',
  DEBIT_CARD: 'Débito',
  PIX: 'PIX',
  CREDIARIO: 'Crediário',
};

@Component({
  selector: 'app-cash-bar',
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule],
  template: `
    <div class="cash-bar" *ngIf="loaded" [class.closed]="!session">
      <mat-icon class="cash-icon">point_of_sale</mat-icon>
      <ng-container *ngIf="session; else noSession">
        <div class="cash-info">
          <strong>Caixa aberto</strong>
          <span>desde {{ session.openedAt | date: 'HH:mm' }}</span>
          <span class="dot">·</span>
          <span>{{ session.summary?.salesCount ?? 0 }} venda(s)</span>
          <ng-container *ngIf="!blindCount">
            <span class="dot">·</span>
            <span>Dinheiro na gaveta <strong>R$ {{ session.summary?.expectedCash ?? 0 | number: '1.2-2' }}</strong></span>
          </ng-container>
        </div>
        <div class="cash-actions">
          <button mat-stroked-button type="button" (click)="startMovement('SUPPLY')">
            <mat-icon>add_card</mat-icon> Suprimento
          </button>
          <button mat-stroked-button type="button" (click)="startMovement('WITHDRAWAL')">
            <mat-icon>savings</mat-icon> Sangria
          </button>
          <button mat-flat-button color="primary" type="button" (click)="startClose()">
            <mat-icon>lock</mat-icon> Fechar caixa
          </button>
          <a mat-icon-button routerLink="/cash-sessions" aria-label="Histórico de caixas" title="Histórico de caixas">
            <mat-icon>history</mat-icon>
          </a>
        </div>
      </ng-container>
      <ng-template #noSession>
        <div class="cash-info"><strong>Caixa fechado</strong><span>Abra o caixa para começar a vender.</span></div>
        <div class="cash-actions">
          <button mat-flat-button color="primary" type="button" (click)="requestOpen()">
            <mat-icon>lock_open</mat-icon> Abrir caixa
          </button>
          <a mat-icon-button routerLink="/cash-sessions" aria-label="Histórico de caixas" title="Histórico de caixas">
            <mat-icon>history</mat-icon>
          </a>
        </div>
      </ng-template>
    </div>
    <p class="cash-load-error" *ngIf="loadError" role="alert">{{ loadError }}
      <button mat-button type="button" (click)="refresh()">Tentar de novo</button>
    </p>

    <div class="modal-overlay" *ngIf="dialog" role="dialog" aria-modal="true">
      <mat-card class="modal-content" appearance="outlined" (click)="$event.stopPropagation()">

        <ng-container *ngIf="dialog === 'open'">
          <div class="modal-header">
            <mat-icon class="modal-header-icon">lock_open</mat-icon>
            <h3>Abrir caixa</h3>
          </div>
          <p class="hint">Conte o dinheiro que está na gaveta para o troco e informe o valor.</p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Troco inicial (R$)</mat-label>
            <input matInput #amountField type="number" min="0" step="0.01" class="amount-input"
                   [(ngModel)]="amount" (keydown.enter)="confirmOpen()" />
          </mat-form-field>
          <p class="error" *ngIf="error" role="alert">{{ error }}</p>
          <div class="actions">
            <button mat-button type="button" (click)="closeDialog()">Agora não</button>
            <button mat-flat-button color="primary" type="button" (click)="confirmOpen()" [disabled]="busy">
              <mat-icon>check</mat-icon> Abrir caixa
            </button>
          </div>
        </ng-container>

        <ng-container *ngIf="dialog === 'movement'">
          <div class="modal-header">
            <mat-icon class="modal-header-icon">{{ movementType === 'WITHDRAWAL' ? 'savings' : 'add_card' }}</mat-icon>
            <h3>{{ movementType === 'WITHDRAWAL' ? 'Sangria' : 'Suprimento' }}</h3>
          </div>
          <p class="hint">
            {{ movementType === 'WITHDRAWAL'
              ? 'Retirada de dinheiro da gaveta (ex.: levar ao banco ou ao cofre).'
              : 'Entrada de dinheiro na gaveta (ex.: reforço de troco).' }}
          </p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Valor (R$)</mat-label>
            <input matInput #amountField type="number" min="0.01" step="0.01" class="amount-input"
                   [(ngModel)]="amount" (keydown.enter)="confirmMovement()" />
          </mat-form-field>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Motivo (opcional)</mat-label>
            <input matInput maxlength="120" [(ngModel)]="reason" (keydown.enter)="confirmMovement()" />
          </mat-form-field>
          <p class="error" *ngIf="error" role="alert">{{ error }}</p>
          <div class="actions">
            <button mat-button type="button" (click)="closeDialog()">Cancelar</button>
            <button mat-flat-button color="primary" type="button" (click)="confirmMovement()" [disabled]="busy">
              <mat-icon>check</mat-icon> Confirmar
            </button>
          </div>
        </ng-container>

        <ng-container *ngIf="dialog === 'close' && session">
          <div class="modal-header">
            <mat-icon class="modal-header-icon">lock</mat-icon>
            <h3>Fechar caixa</h3>
          </div>
          <div class="warning" *ngIf="(session.pendingDeliveryOrders ?? 0) > 0">
            <mat-icon>delivery_dining</mat-icon>
            <span>Há {{ session.pendingDeliveryOrders }} pedido(s) de delivery em andamento. Confira antes de fechar.</span>
          </div>
          <div class="summary">
            <div class="line"><span>Vendas</span><strong>{{ session.summary?.salesCount ?? 0 }}</strong></div>
            <div class="line"><span>Total vendido</span><strong>R$ {{ session.summary?.salesTotal ?? 0 | number: '1.2-2' }}</strong></div>
            <div class="line sub" *ngFor="let entry of session.summary?.receivedByMethod ?? []">
              <span>{{ methodLabel(entry.method) }}</span><span>R$ {{ entry.amount | number: '1.2-2' }}</span>
            </div>
            <ng-container *ngIf="!blindCount">
              <div class="line divider"><span>Troco inicial</span><span>R$ {{ session.openingAmount | number: '1.2-2' }}</span></div>
              <div class="line sub"><span>Suprimentos</span><span>+ R$ {{ session.summary?.supplies ?? 0 | number: '1.2-2' }}</span></div>
              <div class="line sub"><span>Sangrias</span><span>- R$ {{ session.summary?.withdrawals ?? 0 | number: '1.2-2' }}</span></div>
              <div class="line sub" *ngIf="(session.summary?.cashRefunds ?? 0) > 0"><span>Devoluções em dinheiro</span><span>- R$ {{ session.summary?.cashRefunds | number: '1.2-2' }}</span></div>
              <div class="line total"><span>Dinheiro esperado</span><strong>R$ {{ session.summary?.expectedCash ?? 0 | number: '1.2-2' }}</strong></div>
            </ng-container>
          </div>
          <mat-form-field appearance="outline" class="full-width with-hint">
            <mat-label>Dinheiro contado na gaveta (R$)</mat-label>
            <input matInput #amountField type="number" min="0" step="0.01" class="amount-input"
                   [(ngModel)]="amount" (keydown.enter)="confirmClose()" />
            <mat-hint>{{ blindCount ? 'Conte as notas e moedas. A conferência aparece depois de fechar.' : 'Deixe em branco para fechar sem conferência.' }}</mat-hint>
          </mat-form-field>
          <p class="difference" *ngIf="!blindCount && amount !== null && amount !== undefined"
             [class.short]="previewDifference() < 0" [class.over]="previewDifference() > 0">
            {{ differenceLabel(previewDifference()) }}
          </p>
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Observação (opcional)</mat-label>
            <input matInput maxlength="500" [(ngModel)]="reason" />
          </mat-form-field>
          <p class="error" *ngIf="error" role="alert">{{ error }}</p>
          <div class="actions">
            <button mat-button type="button" (click)="printCurrent()"><mat-icon>print</mat-icon> Parcial</button>
            <span class="spacer"></span>
            <button mat-button type="button" (click)="closeDialog()">Cancelar</button>
            <button mat-flat-button color="primary" type="button" (click)="confirmClose()" [disabled]="busy">
              <mat-icon>lock</mat-icon> Fechar caixa
            </button>
          </div>
        </ng-container>

        <ng-container *ngIf="dialog === 'closed' && closedSession">
          <div class="modal-header">
            <mat-icon class="modal-header-icon ok">task_alt</mat-icon>
            <h3>Caixa fechado</h3>
          </div>
          <div class="summary">
            <div class="line"><span>Total vendido</span><strong>R$ {{ closedSession.summary?.salesTotal ?? 0 | number: '1.2-2' }}</strong></div>
            <div class="line"><span>Dinheiro esperado</span><strong>R$ {{ closedSession.summary?.expectedCash ?? 0 | number: '1.2-2' }}</strong></div>
            <div class="line" *ngIf="closedSession.countedAmount !== null && closedSession.countedAmount !== undefined">
              <span>Dinheiro contado</span><strong>R$ {{ closedSession.countedAmount | number: '1.2-2' }}</strong>
            </div>
          </div>
          <p class="difference big" *ngIf="closedSession.difference !== null && closedSession.difference !== undefined"
             [class.short]="closedSession.difference < 0" [class.over]="closedSession.difference > 0">
            {{ differenceLabel(closedSession.difference) }}
          </p>
          <div class="actions">
            <button mat-stroked-button type="button" (click)="printClosed()"><mat-icon>print</mat-icon> Imprimir</button>
            <span class="spacer"></span>
            <button mat-button type="button" (click)="closeDialog()">Fechar</button>
            <button mat-flat-button color="primary" type="button" (click)="requestOpen()">
              <mat-icon>lock_open</mat-icon> Abrir novo caixa
            </button>
          </div>
        </ng-container>
      </mat-card>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .cash-bar {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-wrap: wrap;
      padding: 8px 14px;
      margin-bottom: 10px;
      border: 1px solid var(--border);
      border-left: 4px solid var(--success);
      border-radius: var(--radius);
      background: var(--surface);
    }
    .cash-bar.closed { border-left-color: var(--danger); }
    .cash-icon { color: var(--primary); }
    .cash-info { display: flex; align-items: baseline; gap: 6px; flex-wrap: wrap; flex: 1; min-width: 200px; font-size: 14px; color: var(--text); }
    .cash-info span { color: var(--text-secondary); }
    .cash-info .dot { opacity: 0.6; }
    .cash-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .cash-actions button mat-icon { margin-right: 4px; }
    .cash-load-error { color: var(--danger); font-size: 13px; margin: 0 0 8px; }
    .modal-overlay {
      position: fixed; inset: 0; z-index: 1100;
      display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px);
      padding: 16px;
    }
    .modal-content { width: 440px; max-width: 100%; max-height: 90vh; overflow-y: auto; padding: 24px; border-radius: var(--radius-md); }
    .modal-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .modal-header h3 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text); }
    .modal-header-icon { color: var(--primary); font-size: 28px; width: 28px; height: 28px; }
    .modal-header-icon.ok { color: var(--success); }
    .hint { margin: 0 0 16px; color: var(--text-secondary); font-size: 14px; }
    .full-width { width: 100%; }
    .with-hint { margin-bottom: 18px; }
    .amount-input { font-size: 22px !important; font-weight: 700; text-align: right; font-family: var(--font-mono) !important; }
    .actions { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin-top: 8px; flex-wrap: wrap; }
    .spacer { flex: 1; }
    .error { color: var(--danger); font-size: 13px; margin: 0 0 8px; }
    .warning {
      display: flex; gap: 8px; align-items: center; padding: 10px 12px; margin-bottom: 12px;
      background: rgba(200, 136, 31, 0.12); border: 1px solid rgba(200, 136, 31, 0.45);
      border-radius: var(--radius); color: var(--text); font-size: 13px;
    }
    .summary { padding: 12px 14px; margin-bottom: 16px; background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius); }
    .line { display: flex; justify-content: space-between; padding: 3px 0; font-size: 14px; color: var(--text); }
    .line.sub { padding-left: 12px; color: var(--text-secondary); font-size: 13px; }
    .line.divider { margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border); }
    .line.total { margin-top: 6px; padding-top: 6px; border-top: 2px solid var(--border); font-size: 15px; }
    .difference { margin: 0 0 12px; padding: 8px 12px; border-radius: var(--radius); background: var(--success-bg); color: var(--success); font-weight: 600; }
    .difference.short { background: var(--danger-bg); color: var(--danger); }
    .difference.over { background: rgba(200, 136, 31, 0.12); color: var(--text); }
    .difference.big { font-size: 18px; text-align: center; padding: 14px; }
  `],
})
export class CashBarComponent implements OnInit {
  private readonly cashSessions = inject(CashSessionService);
  private readonly authService = inject(AuthService);

  @Output() sessionChange = new EventEmitter<CashSessionDTO | null>();
  @Output() notify = new EventEmitter<string>();
  @ViewChild('amountField') amountField?: ElementRef<HTMLInputElement>;

  session: CashSessionDTO | null = null;
  closedSession: CashSessionDTO | null = null;
  loaded = false;
  loadError = '';
  dialog: CashDialog = null;
  movementType: CashMovementType = 'WITHDRAWAL';
  amount: number | null = null;
  reason = '';
  error = '';
  busy = false;
  readonly blindCount = !this.authService.canManageTenantUsers();

  get dialogOpen(): boolean {
    return this.dialog !== null;
  }

  ngOnInit(): void {
    this.refresh(true);
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (this.dialog && event.key === 'Escape') {
      event.preventDefault();
      this.closeDialog();
    }
  }

  refresh(promptWhenClosed = false): void {
    this.cashSessions.current().subscribe({
      next: (session) => {
        this.loaded = true;
        this.loadError = '';
        this.setSession(session);
        if (!session && promptWhenClosed) this.requestOpen();
      },
      error: () => {
        this.loaded = true;
        this.loadError = 'Não foi possível consultar o caixa.';
      },
    });
  }

  requestOpen(): void {
    this.closedSession = null;
    this.showDialog('open', 0);
  }

  startMovement(type: CashMovementType): void {
    this.movementType = type;
    this.showDialog('movement', null);
  }

  startClose(): void {
    if (!this.session) return;
    this.cashSessions.get(this.session.id).subscribe({
      next: (session) => this.setSession(session),
      error: () => {},
    });
    this.showDialog('close', null);
  }

  closeDialog(): void {
    this.dialog = null;
    this.error = '';
  }

  confirmOpen(): void {
    const value = Number(this.amount ?? 0);
    if (!Number.isFinite(value) || value < 0) {
      this.error = 'Informe um valor igual ou maior que zero.';
      return;
    }
    this.run(this.cashSessions.open(value), (session) => {
      this.setSession(session);
      this.closeDialog();
      this.notify.emit('Caixa aberto. Boas vendas!');
    });
  }

  confirmMovement(): void {
    if (!this.session) return;
    const value = Number(this.amount ?? 0);
    if (!Number.isFinite(value) || value <= 0) {
      this.error = 'Informe um valor maior que zero.';
      return;
    }
    const label = this.movementType === 'WITHDRAWAL' ? 'Sangria' : 'Suprimento';
    this.run(this.cashSessions.addMovement(this.session.id, this.movementType, value, this.reason.trim()), (session) => {
      this.setSession(session);
      this.closeDialog();
      this.notify.emit(`${label} de R$ ${value.toFixed(2).replace('.', ',')} registrado.`);
    });
  }

  confirmClose(): void {
    if (!this.session) return;
    const counted = this.countedValue();
    if (counted !== null && (!Number.isFinite(counted) || counted < 0)) {
      this.error = 'Informe um valor válido para o dinheiro contado.';
      return;
    }
    if (counted === null && this.blindCount) {
      this.error = 'Informe quanto dinheiro tem na gaveta.';
      return;
    }
    this.run(this.cashSessions.close(this.session.id, counted, this.reason.trim()), (session) => {
      this.closedSession = session;
      this.setSession(null);
      this.dialog = 'closed';
      this.error = '';
    });
  }

  private countedValue(): number | null {
    const raw: unknown = this.amount;
    if (raw === null || raw === undefined || raw === '') return null;
    return Number(raw);
  }

  previewDifference(): number {
    const expected = this.session?.summary?.expectedCash ?? 0;
    return Math.round((Number(this.amount ?? 0) - expected) * 100) / 100;
  }

  differenceLabel(difference: number): string {
    if (Math.abs(difference) < 0.005) return 'Caixa conferido: sem diferença.';
    const value = Math.abs(difference).toFixed(2).replace('.', ',');
    return difference < 0 ? `Falta R$ ${value} no caixa.` : `Sobra R$ ${value} no caixa.`;
  }

  methodLabel(method: PaymentMethodEnum): string {
    return METHOD_LABELS[method] ?? method;
  }

  printCurrent(): void {
    if (this.session) printMatrix(buildCashSessionReport(this.session), 'Resumo do caixa');
  }

  printClosed(): void {
    if (this.closedSession) printMatrix(buildCashSessionReport(this.closedSession), 'Fechamento de caixa');
  }

  private setSession(session: CashSessionDTO | null): void {
    this.session = session;
    this.sessionChange.emit(session);
  }

  private showDialog(dialog: CashDialog, amount: number | null): void {
    this.dialog = dialog;
    this.amount = amount;
    this.reason = '';
    this.error = '';
    setTimeout(() => {
      this.amountField?.nativeElement?.focus();
      this.amountField?.nativeElement?.select();
    }, 60);
  }

  private run(request: Observable<CashSessionDTO>, onSuccess: (session: CashSessionDTO) => void): void {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    request.subscribe({
      next: (session) => {
        this.busy = false;
        onSuccess(session);
      },
      error: (err) => {
        this.busy = false;
        this.error = err.error?.message || 'Não foi possível concluir. Tente de novo.';
      },
    });
  }
}
