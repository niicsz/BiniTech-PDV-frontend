import { Component, Input, Output, EventEmitter, ViewChild, ElementRef, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { PaymentDTO, PaymentMethodEnum, SaleDTO } from '../../../shared/models/api.models';
import { SaleService } from '../../services/sale.service';

export interface PaymentConfirmation {
  payments: PaymentDTO[];
  customerName?: string;
  customerPhone?: string;
}

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule
  ],
  template: `
    <div class="modal-overlay" (click)="cancel.emit()">
      <mat-card class="modal-content modal-payment" role="dialog" aria-modal="true" aria-labelledby="payment-title" (click)="$event.stopPropagation()" appearance="outlined">
        <div class="modal-header">
          <h3 id="payment-title">Receber pagamento</h3>
        </div>

        <mat-card-content>
          <div class="payment-total">
            <span class="total-label">Total da venda</span>
            <strong class="total-amount num">R$ {{ total | number:'1.2-2' }}</strong>
          </div>

          <div class="payments-list" *ngIf="payments.length > 0">
            <h4>Pagamentos adicionados</h4>
            <div class="payment-entry" *ngFor="let p of payments; let i = index">
              <span class="entry-label">{{ getPaymentLabel(p.method) }}</span>
              <strong class="entry-amount num">R$ {{ p.amount | number:'1.2-2' }}</strong>
              <button mat-icon-button (click)="removePayment(i)" class="entry-remove" [attr.aria-label]="'Remover pagamento em ' + getPaymentLabel(p.method)">
                <mat-icon>close</mat-icon>
              </button>
            </div>
            <div class="payments-summary">
              <div class="summary-line">
                <span>Total pago</span>
                <strong class="num">R$ {{ getTotalPaid() | number:'1.2-2' }}</strong>
              </div>
              <div class="summary-line remaining" *ngIf="getRemaining() > 0">
                <span>Falta pagar</span>
                <strong class="num">R$ {{ getRemaining() | number:'1.2-2' }}</strong>
              </div>
              <div class="summary-line change" *ngIf="getTotalChange() > 0">
                <span>Troco</span>
                <strong class="num">R$ {{ getTotalChange() | number:'1.2-2' }}</strong>
              </div>
            </div>
          </div>

          <div class="add-payment-section">
            <h4>{{ payments.length > 0 ? 'Adicionar outro pagamento' : 'Forma de pagamento' }}</h4>
            <div class="method-buttons">
              <button mat-stroked-button
                *ngFor="let m of availableMethods"
                [class.active]="selectedMethod === m.value"
                [attr.aria-pressed]="selectedMethod === m.value"
                (click)="selectMethod(m.value)"
                class="method-btn">
                {{ m.label }}
              </button>
            </div>

            <div class="amount-section" *ngIf="selectedMethod">
              <div class="crediario-fields" *ngIf="selectedMethod === 'CREDIARIO'">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Nome do cliente</mat-label>
                  <input matInput #customerNameInput type="text"
                         [(ngModel)]="customerName"
                         (ngModelChange)="onCustomerNameChange($event)"
                         placeholder="Digite o nome do cliente"
                         autocomplete="off" />
                </mat-form-field>

                <div class="debtor-suggestions" *ngIf="filteredDebtors.length > 0 && showSuggestions">
                  <div class="suggestion-header">Já deve no crediário</div>
                  <div class="suggestion-item" *ngFor="let d of filteredDebtors"
                       (click)="selectDebtor(d)">
                    <div class="suggestion-info">
                      <strong>{{ d.name }}</strong>
                      <span *ngIf="d.phone" class="suggestion-phone">{{ d.phone }}</span>
                    </div>
                    <span class="suggestion-debt num">R$ {{ d.totalDebt | number:'1.2-2' }}</span>
                  </div>
                </div>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Telefone do cliente</mat-label>
                  <input matInput type="tel"
                         [(ngModel)]="customerPhone"
                         (ngModelChange)="onPhoneChange($event)"
                         placeholder="(00) 00000-0000"
                         (keydown.enter)="addPayment()"
                         maxlength="15" />
                  <mat-hint *ngIf="customerPhone && !isPhoneValid()" class="phone-error">
                    Use DDD e número: (11) 98765-4321
                  </mat-hint>
                </mat-form-field>

                <div class="duplicate-warning" *ngIf="duplicatePhoneWarning" role="status">
                  <span>{{ duplicatePhoneWarning }}</span>
                </div>
              </div>

              <mat-form-field appearance="outline" class="full-width" *ngIf="selectedMethod === 'CASH'">
                <mat-label>Valor recebido</mat-label>
                <span matTextPrefix>R$&nbsp;</span>
                <input matInput #amountInput type="number" step="0.01" min="0"
                       class="amount-input" [(ngModel)]="currentAmount"
                       (keydown.enter)="addPayment()" autofocus />
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width" *ngIf="selectedMethod !== 'CASH'">
                <mat-label>Valor</mat-label>
                <span matTextPrefix>R$&nbsp;</span>
                <input matInput #amountInputCard type="number" step="0.01" min="0.01"
                       class="amount-input" [(ngModel)]="currentAmount"
                       (keydown.enter)="addPayment()" autofocus />
              </mat-form-field>

              <button mat-stroked-button (click)="addPayment()" class="btn-add">
                Adicionar pagamento
              </button>
            </div>
          </div>
        </mat-card-content>

        <div class="error-banner" *ngIf="errorMessage" role="alert">
          <mat-icon class="error-icon" aria-hidden="true">error</mat-icon>
          <span>{{ errorMessage }}</span>
        </div>

        <mat-card-actions align="end">
          <button mat-stroked-button (click)="cancel.emit()">
            Cancelar <kbd>Esc</kbd>
          </button>
          <button mat-flat-button color="primary" class="confirm-btn"
            (click)="confirmAll()"
            [disabled]="payments.length === 0 || getRemaining() > 0.001 || processing">
            {{ processing ? 'Registrando venda…' : 'Finalizar venda' }}
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      background: rgba(10, 10, 10, 0.45);
      animation: fadeIn 120ms var(--ease);
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal-content {
      max-height: calc(100vh - 32px);
      overflow-y: auto;
      padding: 20px;
      background: var(--surface) !important;
      border: 1px solid var(--border) !important;
      border-radius: var(--radius-md) !important;
      box-shadow: var(--shadow-lg) !important;
    }
    .modal-payment { width: 520px; max-width: 100%; }
    mat-card-content { padding: 0 !important; }
    .modal-header {
      margin-bottom: 12px;
    }
    .modal-header h3 {
      font-size: 18px;
      line-height: 26px;
      font-weight: 600;
    }
    h4 {
      margin-bottom: 8px;
      font-size: 14px;
      font-weight: 500;
      color: var(--text);
    }
    .payment-total {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      padding: 0 0 16px;
      margin-bottom: 16px;
      border-bottom: 1px solid var(--border);
    }
    .total-label {
      color: var(--text-secondary);
    }
    .total-amount {
      font-size: 32px;
      line-height: 38px;
      font-weight: 500;
      letter-spacing: -0.02em;
    }
    .payments-list {
      margin-bottom: 16px;
      padding: 12px 16px;
      background: var(--surface-alt);
      border-radius: var(--radius);
    }
    .payment-entry {
      display: flex;
      align-items: center;
      gap: 8px;
      min-height: 40px;
      border-bottom: 1px solid var(--border-light);
    }
    .entry-label { flex: 1; }
    .entry-amount { font-weight: 500; }
    .entry-remove { --mat-icon-button-icon-color: var(--text-secondary); }
    .payments-summary {
      margin-top: 8px;
    }
    .summary-line {
      display: flex;
      justify-content: space-between;
      padding: 4px 0;
      color: var(--text-secondary);
    }
    .summary-line strong {
      color: var(--text);
      font-weight: 500;
    }
    .summary-line.remaining strong {
      color: var(--danger);
    }
    .summary-line.change {
      margin-top: 6px;
      padding: 10px 12px;
      border-radius: var(--radius);
      background: var(--success-bg);
      color: var(--success-ink);
    }
    .summary-line.change strong {
      color: var(--success-ink);
      font-size: 18px;
    }
    .method-buttons {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 16px;
    }
    .method-btn {
      height: 44px;
      justify-content: flex-start !important;
      padding: 0 14px !important;
      &.active {
        background: var(--primary) !important;
        color: var(--surface) !important;
        border-color: var(--primary) !important;
      }
    }
    .amount-section {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .full-width { width: 100%; }
    .amount-input {
      font-size: 22px !important;
      font-weight: 500;
      text-align: right;
      font-family: var(--font-mono) !important;
      font-variant-numeric: tabular-nums;
    }
    .btn-add { align-self: flex-end; }
    .crediario-fields {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 4px;
    }
    .debtor-suggestions {
      margin: -8px 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      background: var(--surface);
      max-height: 200px;
      overflow-y: auto;
      box-shadow: var(--shadow-lg);
    }
    .suggestion-header {
      padding: 8px 12px;
      font-size: 12px;
      color: var(--text-secondary);
      border-bottom: 1px solid var(--border-light);
    }
    .suggestion-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      min-height: 48px;
      padding: 6px 12px;
      cursor: pointer;
      transition: background-color 120ms var(--ease);
    }
    .suggestion-item:hover {
      background: var(--primary-bg);
    }
    .suggestion-item:not(:last-child) {
      border-bottom: 1px solid var(--border-light);
    }
    .suggestion-info {
      display: flex;
      flex-direction: column;
    }
    .suggestion-info strong {
      font-weight: 500;
    }
    .suggestion-phone {
      font-size: 12px;
      color: var(--text-secondary);
    }
    .suggestion-debt {
      font-weight: 500;
    }
    .phone-error {
      color: var(--danger) !important;
    }
    .duplicate-warning {
      padding: 10px 12px;
      border: 1px solid #fde68a;
      border-radius: var(--radius);
      background: var(--warning-bg);
      color: var(--warning-ink);
      font-size: 13px;
    }
    kbd {
      margin-left: 6px;
      padding: 0 5px;
      border: 1px solid var(--control);
      border-radius: 4px;
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-secondary);
    }
    mat-card-actions {
      display: flex;
      gap: 8px;
      padding: 16px 0 0 !important;
    }
    .add-payment-section {
      margin-bottom: 4px;
    }
    .error-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 12px 0 0;
      padding: 10px 12px;
      border-radius: var(--radius);
      background: var(--danger-bg);
      color: var(--danger-ink);
    }
    .error-banner .error-icon {
      flex: none;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
    @media (max-width: 480px) {
      .method-buttons { grid-template-columns: 1fr; }
      .total-amount { font-size: 28px; }
    }
  `]
})
export class PaymentModalComponent implements AfterViewInit, OnInit {
  @ViewChild('amountInput') amountInput!: ElementRef<HTMLInputElement>;
  @ViewChild('amountInputCard') amountInputCard!: ElementRef<HTMLInputElement>;
  @ViewChild('customerNameInput') customerNameInput!: ElementRef<HTMLInputElement>;

  @Input() total = 0;
  @Input() initialMethod: PaymentMethodEnum | null = null;
  @Input() getPaymentLabel!: (method: string) => string;
  @Input() errorMessage: string = '';
  @Input() processing: boolean = false;

  @Output() paymentsConfirmed = new EventEmitter<PaymentConfirmation>();
  @Output() cancel = new EventEmitter<void>();

  payments: PaymentDTO[] = [];
  selectedMethod: PaymentMethodEnum | null = null;
  currentAmount = 0;
  customerName = '';
  customerPhone = '';
  showSuggestions = false;

  existingDebtors: { name: string; phone: string; totalDebt: number }[] = [];
  filteredDebtors: { name: string; phone: string; totalDebt: number }[] = [];
  duplicatePhoneWarning = '';

  constructor(private saleService: SaleService) {}

  availableMethods = [
    { value: 'CASH' as PaymentMethodEnum, label: 'Dinheiro', icon: 'payments' },
    { value: 'CREDIT_CARD' as PaymentMethodEnum, label: 'Cartão de crédito', icon: 'credit_card' },
    { value: 'DEBIT_CARD' as PaymentMethodEnum, label: 'Cartão de débito', icon: 'credit_card' },
    { value: 'PIX' as PaymentMethodEnum, label: 'Pix', icon: 'pix' },
    { value: 'CREDIARIO' as PaymentMethodEnum, label: 'Crediário', icon: 'account_balance_wallet' },
  ];

  ngOnInit(): void {
    this.loadExistingDebtors();
  }

  ngAfterViewInit(): void {
    if (this.initialMethod) {
      setTimeout(() => this.selectMethod(this.initialMethod!), 50);
    }
  }

  selectMethod(method: PaymentMethodEnum): void {
    this.selectedMethod = method;
    const remaining = this.getRemaining();
    this.currentAmount = remaining > 0 ? parseFloat(remaining.toFixed(2)) : parseFloat(this.total.toFixed(2));

    setTimeout(() => {
      if (method === 'CREDIARIO') {
        this.customerNameInput?.nativeElement?.focus();
      } else if (method === 'CASH') {
        this.amountInput?.nativeElement?.focus();
        this.amountInput?.nativeElement?.select();
      } else {
        this.amountInputCard?.nativeElement?.focus();
        this.amountInputCard?.nativeElement?.select();
      }
    }, 100);
  }

  loadExistingDebtors(): void {
    this.saleService.listDebtors().subscribe({
      next: (sales: SaleDTO[]) => {
        const grouped = new Map<string, { name: string; phone: string; totalDebt: number }>();
        for (const sale of sales) {
          const key = (sale.customerName || 'Desconhecido') + '|' + (sale.customerPhone || '');
          if (!grouped.has(key)) {
            grouped.set(key, {
              name: sale.customerName || 'Desconhecido',
              phone: sale.customerPhone || '',
              totalDebt: 0
            });
          }
          grouped.get(key)!.totalDebt += sale.totalAmount || 0;
        }
        this.existingDebtors = Array.from(grouped.values());
      }
    });
  }

  onCustomerNameChange(value: string): void {
    this.checkDuplicatePhone();
    if (!value || value.trim().length < 2) {
      this.filteredDebtors = [];
      this.showSuggestions = false;
      return;
    }
    const term = value.trim().toLowerCase();
    this.filteredDebtors = this.existingDebtors.filter(d =>
      d.name.toLowerCase().includes(term) ||
      d.phone.includes(term)
    );
    this.showSuggestions = this.filteredDebtors.length > 0;
  }

  selectDebtor(debtor: { name: string; phone: string; totalDebt: number }): void {
    this.customerName = debtor.name;
    this.customerPhone = debtor.phone;
    this.showSuggestions = false;
    this.filteredDebtors = [];
  }

  onPhoneChange(value: string): void {
    const digits = value.replace(/\D/g, '');
    if (digits.length <= 2) {
      this.customerPhone = digits.length > 0 ? '(' + digits : '';
    } else if (digits.length <= 7) {
      this.customerPhone = '(' + digits.substring(0, 2) + ') ' + digits.substring(2);
    } else if (digits.length <= 11) {
      this.customerPhone = '(' + digits.substring(0, 2) + ') ' + digits.substring(2, 7) + '-' + digits.substring(7);
    } else {
      this.customerPhone = '(' + digits.substring(0, 2) + ') ' + digits.substring(2, 7) + '-' + digits.substring(7, 11);
    }
    this.checkDuplicatePhone();
  }

  private checkDuplicatePhone(): void {
    this.duplicatePhoneWarning = '';
    const phoneDigits = this.customerPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10) return;

    const match = this.existingDebtors.find(d => {
      const existingDigits = d.phone.replace(/\D/g, '');
      return existingDigits === phoneDigits;
    });

    if (match) {
      const currentName = this.customerName.trim().toLowerCase();
      const matchName = match.name.trim().toLowerCase();
      if (currentName && matchName !== currentName) {
        this.duplicatePhoneWarning = `Este telefone já está cadastrado para "${match.name}" com dívida de R$ ${match.totalDebt.toFixed(2)}. Verifique se é o mesmo cliente.`;
      } else {
        this.duplicatePhoneWarning = `Cliente "${match.name}" já possui dívida de R$ ${match.totalDebt.toFixed(2)} neste telefone.`;
      }
    }
  }

  isPhoneValid(): boolean {
    if (!this.customerPhone || !this.customerPhone.trim()) return true;
    const digits = this.customerPhone.replace(/\D/g, '');
    return digits.length === 10 || digits.length === 11;
  }

  addPayment(): void {
    if (!this.selectedMethod || this.currentAmount <= 0) return;

    if (this.selectedMethod === 'CREDIARIO' && (!this.customerName.trim() || !this.customerPhone.trim())) {
      return;
    }

    if (this.selectedMethod === 'CREDIARIO' && !this.isPhoneValid()) {
      return;
    }

    this.payments.push({
      method: this.selectedMethod,
      amount: parseFloat(this.currentAmount.toFixed(2))
    });

    this.selectedMethod = null;
    this.currentAmount = 0;
  }

  removePayment(index: number): void {
    this.payments.splice(index, 1);
  }

  getTotalPaid(): number {
    return this.payments.reduce((sum, p) => sum + p.amount, 0);
  }

  getRemaining(): number {
    return Math.max(0, this.total - this.getTotalPaid());
  }

  getTotalChange(): number {
    return Math.max(0, this.getTotalPaid() - this.total);
  }

  confirmAll(): void {
    if (this.payments.length === 0 || this.getRemaining() > 0.001) return;
    const hasCrediario = this.payments.some(p => p.method === 'CREDIARIO');
    const confirmation: PaymentConfirmation = {
      payments: [...this.payments],
      ...(hasCrediario && this.customerName.trim() ? { customerName: this.customerName.trim() } : {}),
      ...(hasCrediario && this.customerPhone.trim() ? { customerPhone: this.customerPhone.trim() } : {})
    };
    this.paymentsConfirmed.emit(confirmation);
  }

  getMethodIcon(method: PaymentMethodEnum): string {
    const icons: Record<string, string> = {
      'CASH': 'payments',
      'CREDIT_CARD': 'credit_card',
      'DEBIT_CARD': 'credit_card',
      'PIX': 'pix',
      'CREDIARIO': 'account_balance_wallet'
    };
    return icons[method] || 'payment';
  }
}
