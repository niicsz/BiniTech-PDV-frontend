import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Subscription, interval, startWith } from 'rxjs';
import { AuthService } from '../auth/services/auth.service';
import { DeliveryFeatureService } from './delivery-feature.service';
import {
  DeliveryOrder,
  DeliveryOrderStatus,
  DeliveryPaymentMethod,
  DeliveryService,
  DeliverySettings,
  DeliverySettingsRequest,
  PAYMENT_LABELS,
  SalePaymentMethod,
  STATUS_LABELS,
  brl,
  formatPhone,
} from './delivery.service';

type OrderFilter = 'active' | 'COMPLETED' | 'CANCELLED';

const ACTIVE: DeliveryOrderStatus[] = ['RECEIVED', 'ACCEPTED', 'DISPATCHED'];

@Component({
  selector: 'app-delivery-admin',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="delivery">
      <header class="top">
        <div>
          <a routerLink="/pdv" class="back">← Voltar ao PDV</a>
          <h1>Delivery</h1>
          <p class="subtitle">Seus clientes pedem pelo link, você recebe no WhatsApp e acompanha tudo aqui.</p>
        </div>
        @if (settings(); as s) {
          @if (s.enabled) {
            <div class="store-state" [class.open]="s.open">
              <span class="dot"></span>
              <span>{{ s.open ? 'Loja aberta' : 'Loja fechada' }}</span>
              @if (canManage) {
                <button mat-stroked-button type="button" (click)="toggleOpen()" [disabled]="saving()">
                  {{ s.open ? 'Fechar agora' : 'Abrir agora' }}
                </button>
              }
            </div>
          }
        }
      </header>

      @if (loading()) {
        <div class="loading"><mat-spinner diameter="36"></mat-spinner></div>
      } @else if (settings(); as s) {
        @if (s.enabled) {
          <div class="share">
            <mat-icon>link</mat-icon>
            <div class="share-text">
              <strong>Link do seu cardápio</strong>
              <code>{{ storeUrl() }}</code>
            </div>
            <button mat-stroked-button type="button" (click)="copyLink()"><mat-icon>content_copy</mat-icon> Copiar</button>
            <a mat-stroked-button [href]="shareOnWhatsapp()" target="_blank" rel="noopener"><mat-icon>share</mat-icon> Divulgar</a>
            <a mat-stroked-button [href]="storeUrl()" target="_blank" rel="noopener"><mat-icon>open_in_new</mat-icon> Abrir</a>
          </div>
        }

        <nav class="tabs" role="tablist">
          <button type="button" role="tab" [class.on]="tab() === 'orders'" (click)="tab.set('orders')">
            Pedidos @if (newCount() > 0) { <span class="pill">{{ newCount() }}</span> }
          </button>
          @if (canManage) {
            <button type="button" role="tab" [class.on]="tab() === 'settings'" (click)="tab.set('settings')">Configuração</button>
          }
        </nav>

        @if (tab() === 'orders') {
          @if (!s.enabled) {
            <div class="empty">
              <mat-icon>delivery_dining</mat-icon>
              <p><strong>O delivery está desligado.</strong></p>
              <p>{{ canManage ? 'Ligue em Configuração, informe o WhatsApp da loja e marque em Produtos o que aparece no cardápio.' : 'Peça ao administrador da loja para ligar o delivery.' }}</p>
              @if (canManage) {
                <button mat-flat-button color="primary" type="button" (click)="tab.set('settings')">Configurar delivery</button>
              }
            </div>
          } @else {
            <div class="filters">
              <button type="button" [class.on]="filter() === 'active'" (click)="setFilter('active')">Em andamento</button>
              <button type="button" [class.on]="filter() === 'COMPLETED'" (click)="setFilter('COMPLETED')">Concluídos</button>
              <button type="button" [class.on]="filter() === 'CANCELLED'" (click)="setFilter('CANCELLED')">Cancelados</button>
              <span class="refresh">Atualiza sozinho a cada 20 s</span>
            </div>

            @if (visibleOrders().length === 0) {
              <div class="empty small">
                <p>{{ filter() === 'active' ? 'Nenhum pedido em andamento. Divulgue o link do cardápio para receber pedidos.' : 'Nada por aqui ainda.' }}</p>
              </div>
            }

            <div class="orders">
              @for (order of visibleOrders(); track order.id) {
                <article class="order" [attr.data-status]="order.status">
                  <header>
                    <div>
                      <span class="number">#{{ order.number }}</span>
                      <span class="status">{{ statusLabel(order.status) }}</span>
                    </div>
                    <time>{{ order.createdAt | date: 'dd/MM HH:mm' }}</time>
                  </header>

                  <div class="customer">
                    <strong>{{ order.customerName }}</strong>
                    <a [href]="customerWhatsapp(order)" target="_blank" rel="noopener" matTooltip="Falar com o cliente no WhatsApp">
                      <mat-icon>chat</mat-icon> {{ phone(order.customerPhone) }}
                    </a>
                  </div>

                  <p class="where">
                    @if (order.fulfillment === 'DELIVERY' && order.address) {
                      <mat-icon>two_wheeler</mat-icon>
                      <span>
                        {{ order.address.street }}, {{ order.address.number }}
                        @if (order.address.complement) { - {{ order.address.complement }} }
                        - {{ order.address.district }}
                        @if (order.address.reference) { <em>Ref.: {{ order.address.reference }}</em> }
                      </span>
                    } @else {
                      <mat-icon>storefront</mat-icon><span>Retirada na loja</span>
                    }
                  </p>

                  <ul class="items">
                    @for (item of order.items; track $index) {
                      <li>
                        <span>{{ item.quantity }}x {{ item.description }}</span>
                        <span class="money">{{ money(item.subtotal) }}</span>
                        @if (item.notes) { <em>{{ item.notes }}</em> }
                      </li>
                    }
                  </ul>

                  @if (order.notes) { <p class="notes">Obs.: {{ order.notes }}</p> }

                  <dl class="totals">
                    @if (order.fulfillment === 'DELIVERY') {
                      <div><dt>Taxa de entrega</dt><dd>{{ money(order.deliveryFee) }}</dd></div>
                    }
                    <div class="total"><dt>Total</dt><dd>{{ money(order.total) }}</dd></div>
                    <div>
                      <dt>Pagamento</dt>
                      <dd>{{ paymentLabel(order.paymentMethod) }}@if (order.changeFor) { · troco p/ {{ money(order.changeFor) }} }</dd>
                    </div>
                  </dl>

                  @if (completing() === order.id) {
                    <div class="complete-box">
                      <mat-form-field appearance="outline">
                        <mat-label>Como o cliente pagou?</mat-label>
                        <mat-select [(ngModel)]="completeMethod" name="completeMethod">
                          <mat-option value="PIX">Pix</mat-option>
                          <mat-option value="CASH">Dinheiro</mat-option>
                          <mat-option value="DEBIT_CARD">Cartão de débito</mat-option>
                          <mat-option value="CREDIT_CARD">Cartão de crédito</mat-option>
                        </mat-select>
                      </mat-form-field>
                      <p class="hint">A venda entra no caixa com {{ money(order.subtotal) }} em produtos e baixa o estoque. A taxa de entrega fica só no pedido.</p>
                      <div class="row">
                        <button mat-stroked-button type="button" (click)="completing.set(null)">Voltar</button>
                        <button mat-flat-button color="primary" type="button" (click)="complete(order)" [disabled]="busy() === order.id">Lançar venda</button>
                      </div>
                    </div>
                  } @else {
                    <div class="actions">
                      @switch (order.status) {
                        @case ('RECEIVED') {
                          <button mat-flat-button color="primary" type="button" (click)="move(order, 'ACCEPTED')" [disabled]="busy() === order.id">Aceitar</button>
                        }
                        @case ('ACCEPTED') {
                          <button mat-flat-button color="primary" type="button" (click)="move(order, 'DISPATCHED')" [disabled]="busy() === order.id">
                            {{ order.fulfillment === 'DELIVERY' ? 'Saiu para entrega' : 'Pronto para retirar' }}
                          </button>
                          <button mat-stroked-button type="button" (click)="startComplete(order)">Concluir</button>
                        }
                        @case ('DISPATCHED') {
                          <button mat-flat-button color="primary" type="button" (click)="startComplete(order)">Concluir</button>
                        }
                      }
                      @if (isActive(order)) {
                        <button mat-button type="button" class="cancel" (click)="move(order, 'CANCELLED')" [disabled]="busy() === order.id">Cancelar</button>
                      }
                      @if (order.status === 'COMPLETED') {
                        <span class="done"><mat-icon>check_circle</mat-icon> Venda lançada no caixa</span>
                      }
                    </div>
                  }
                </article>
              }
            </div>
          }
        }

        @if (tab() === 'settings' && canManage) {
          <form class="card" (ngSubmit)="save()">
            <div class="toggle-row">
              <mat-slide-toggle [(ngModel)]="form.enabled" name="enabled">Delivery ligado</mat-slide-toggle>
              <mat-slide-toggle [(ngModel)]="form.open" name="open" [disabled]="!form.enabled">Aceitando pedidos agora</mat-slide-toggle>
            </div>

            <h2>Onde você recebe os pedidos</h2>
            <div class="grid">
              <mat-form-field appearance="outline">
                <mat-label>WhatsApp da loja</mat-label>
                <input matInput [(ngModel)]="form.whatsapp" name="whatsapp" inputmode="tel" placeholder="(11) 91234-5678" />
                <mat-hint>O cliente envia o pedido para este número.</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline" class="wide">
                <mat-label>Aviso no topo do cardápio</mat-label>
                <input matInput [(ngModel)]="form.message" name="message" maxlength="280" placeholder="Ex.: Entregamos no Jardim Rochdale e Vila Yara" />
              </mat-form-field>
            </div>

            <h2>Entrega e retirada</h2>
            <div class="toggle-row">
              <mat-checkbox [(ngModel)]="form.deliveryAvailable" name="deliveryAvailable">Faz entrega</mat-checkbox>
              <mat-checkbox [(ngModel)]="form.pickupAvailable" name="pickupAvailable">Cliente pode retirar na loja</mat-checkbox>
            </div>
            <div class="grid">
              <mat-form-field appearance="outline">
                <mat-label>Taxa de entrega (R$)</mat-label>
                <input matInput type="number" min="0" step="0.5" [(ngModel)]="form.deliveryFee" name="deliveryFee" />
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Pedido mínimo (R$)</mat-label>
                <input matInput type="number" min="0" step="1" [(ngModel)]="form.minimumOrder" name="minimumOrder" />
                <mat-hint>Sem contar a taxa. Use 0 para não ter mínimo.</mat-hint>
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Tempo estimado (min)</mat-label>
                <input matInput type="number" min="5" max="600" step="5" [(ngModel)]="form.estimatedMinutes" name="estimatedMinutes" />
              </mat-form-field>
              @if (form.pickupAvailable) {
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Endereço para retirada</mat-label>
                  <input matInput [(ngModel)]="form.pickupAddress" name="pickupAddress" maxlength="200" />
                </mat-form-field>
              }
            </div>

            <h2>Pagamento</h2>
            <div class="toggle-row">
              @for (method of methods; track method) {
                <mat-checkbox [checked]="form.acceptedPayments.includes(method)" (change)="togglePayment(method, $event.checked)">
                  {{ paymentLabel(method) }}
                </mat-checkbox>
              }
            </div>
            @if (form.acceptedPayments.includes('PIX')) {
              <div class="grid">
                <mat-form-field appearance="outline" class="wide">
                  <mat-label>Chave Pix</mat-label>
                  <input matInput [(ngModel)]="form.pixKey" name="pixKey" maxlength="120" />
                  <mat-hint>Aparece para o cliente depois que ele faz o pedido.</mat-hint>
                </mat-form-field>
              </div>
            }

            <p class="hint">
              Só aparecem no cardápio os produtos ativos marcados com <strong>Mostrar no delivery</strong> em
              <a routerLink="/products">Produtos</a>. Produto sem estoque aparece como esgotado.
            </p>

            <div class="actions end">
              <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
                <mat-icon>save</mat-icon> Salvar
              </button>
            </div>
          </form>
        }
      }
    </div>
  `,
  styles: [`
    .delivery { max-width:1100px; margin:0 auto; padding:40px 24px 80px; }
    .top { display:flex; justify-content:space-between; align-items:flex-end; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
    .back { color:var(--primary-text); text-decoration:none; font-size:13px; font-weight:600; }
    h1 { font-family:var(--font-display); margin:8px 0 4px; font-size:34px; font-weight:800; letter-spacing:-1px; color:var(--text); }
    .subtitle { margin:0; color:var(--text-secondary); }
    h2 { font-family:var(--font-display); font-size:18px; font-weight:700; margin:22px 0 12px; color:var(--text); }
    .loading { display:flex; justify-content:center; padding:60px; }
    .store-state { display:flex; align-items:center; gap:10px; padding:8px 8px 8px 14px; border:2px solid var(--text);
      border-radius:100px; background:var(--surface); font-weight:700; color:var(--danger); }
    .store-state.open { color:var(--success); }
    .store-state .dot { width:10px; height:10px; border-radius:50%; background:currentColor; }
    .share { display:flex; align-items:center; gap:12px; flex-wrap:wrap; background:var(--surface); border:1.5px solid var(--border);
      border-radius:var(--radius-md); padding:14px 16px; margin-bottom:20px; }
    .share-text { flex:1; min-width:200px; display:flex; flex-direction:column; gap:2px; }
    .share code { font-family:var(--font-mono); font-size:13px; color:var(--text-secondary); word-break:break-all; }
    .share a, .share button { display:inline-flex; align-items:center; gap:6px; }
    .tabs { display:flex; gap:4px; border-bottom:2px solid var(--text); margin-bottom:18px; }
    .tabs button { background:none; border:none; padding:10px 16px; font:inherit; font-weight:700; color:var(--text-secondary);
      cursor:pointer; border-radius:var(--radius-md) var(--radius-md) 0 0; display:flex; align-items:center; gap:8px; }
    .tabs button.on { background:var(--text); color:var(--bg); }
    .pill { background:var(--primary); color:#fff; border-radius:100px; font-size:12px; padding:1px 8px; }
    .filters { display:flex; gap:8px; align-items:center; flex-wrap:wrap; margin-bottom:16px; }
    .filters button { border:1.5px solid var(--border); background:var(--surface); color:var(--text); padding:6px 14px;
      border-radius:100px; font:inherit; font-size:13.5px; font-weight:600; cursor:pointer; }
    .filters button.on { border-color:var(--text); background:var(--text); color:var(--bg); }
    .refresh { margin-left:auto; font-size:12px; color:var(--text-tertiary); }
    .orders { display:grid; grid-template-columns:repeat(auto-fill, minmax(320px, 1fr)); gap:16px; }
    .order { background:var(--surface); border:2px solid var(--text); border-radius:var(--radius-md); padding:16px;
      box-shadow:4px 4px 0 var(--shadow-hard-color); display:flex; flex-direction:column; gap:10px; }
    .order[data-status='RECEIVED'] { border-color:var(--primary); box-shadow:4px 4px 0 var(--primary); }
    .order[data-status='COMPLETED'], .order[data-status='CANCELLED'] { box-shadow:none; opacity:.85; }
    .order header { display:flex; justify-content:space-between; align-items:center; }
    .number { font-family:var(--font-display); font-size:22px; font-weight:800; margin-right:8px; color:var(--text); }
    .status { font-family:var(--font-mono); font-size:11.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em;
      padding:3px 8px; border-radius:100px; border:1.5px solid currentColor; color:var(--accent); }
    .order[data-status='RECEIVED'] .status { color:var(--primary); }
    .order[data-status='COMPLETED'] .status { color:var(--success); }
    .order[data-status='CANCELLED'] .status { color:var(--danger); }
    time { font-family:var(--font-mono); font-size:12.5px; color:var(--text-tertiary); }
    .customer { display:flex; justify-content:space-between; align-items:center; gap:8px; flex-wrap:wrap; color:var(--text); }
    .customer a { display:inline-flex; align-items:center; gap:4px; color:var(--success); font-weight:600; text-decoration:none; font-size:14px; }
    .customer a mat-icon { font-size:18px; width:18px; height:18px; }
    .where { display:flex; gap:6px; margin:0; font-size:14px; color:var(--text-secondary); }
    .where mat-icon { font-size:18px; width:18px; height:18px; flex:none; }
    .where em { display:block; font-size:13px; }
    .items { list-style:none; margin:0; padding:10px 0; border-top:1px dashed var(--border); border-bottom:1px dashed var(--border);
      display:flex; flex-direction:column; gap:6px; }
    .items li { display:grid; grid-template-columns:1fr auto; gap:2px 12px; font-size:14px; color:var(--text); }
    .items em { grid-column:1 / -1; font-size:12.5px; color:var(--accent); }
    .money { font-variant-numeric:tabular-nums; }
    .notes { margin:0; font-size:13.5px; color:var(--text-secondary); }
    .totals { margin:0; display:flex; flex-direction:column; gap:4px; font-size:14px; }
    .totals div { display:flex; justify-content:space-between; gap:12px; }
    .totals dt { color:var(--text-secondary); }
    .totals dd { margin:0; font-variant-numeric:tabular-nums; color:var(--text); text-align:right; }
    .totals .total dd, .totals .total dt { font-weight:800; color:var(--text); }
    .actions { display:flex; flex-wrap:wrap; gap:8px; align-items:center; margin-top:auto; }
    .actions.end { justify-content:flex-end; margin-top:24px; }
    .actions button { display:inline-flex; align-items:center; gap:6px; }
    .cancel { color:var(--danger) !important; margin-left:auto; }
    .done { display:inline-flex; align-items:center; gap:6px; color:var(--success); font-weight:600; font-size:14px; }
    .complete-box { display:flex; flex-direction:column; gap:6px; }
    .complete-box .row { display:flex; justify-content:flex-end; gap:8px; }
    .hint { color:var(--text-secondary); font-size:13.5px; margin:4px 0; }
    .hint a { color:var(--primary-text); }
    .empty { text-align:center; padding:48px 16px; border:2px dashed var(--border); border-radius:var(--radius-md); color:var(--text-secondary); }
    .empty mat-icon { font-size:48px; width:48px; height:48px; color:var(--primary); }
    .empty.small { padding:28px 16px; }
    .card { background:var(--surface); border:2px solid var(--text); border-radius:var(--radius-md); padding:26px;
      box-shadow:6px 6px 0 var(--shadow-hard-color); }
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:14px 16px; }
    .grid .wide { grid-column:span 2; }
    .toggle-row { display:flex; flex-wrap:wrap; gap:12px 28px; margin-bottom:8px; }
    @media (max-width: 640px) {
      .delivery { padding:24px 16px 80px; }
      .grid .wide { grid-column:auto; }
      .orders { grid-template-columns:1fr; }
      .refresh { margin-left:0; width:100%; }
    }
  `],
})
export class DeliveryAdminComponent implements OnInit, OnDestroy {
  private readonly deliveryService = inject(DeliveryService);
  private readonly feature = inject(DeliveryFeatureService);
  private readonly snackBar = inject(MatSnackBar);
  private readonly authService = inject(AuthService);
  private poll: Subscription | null = null;
  private knownNew = new Set<string>();

  readonly canManage = this.authService.canManageTenantUsers();
  readonly methods: DeliveryPaymentMethod[] = ['PIX', 'CASH', 'CARD'];

  settings = signal<DeliverySettings | null>(null);
  orders = signal<DeliveryOrder[]>([]);
  loading = signal(true);
  saving = signal(false);
  busy = signal<string | null>(null);
  completing = signal<string | null>(null);
  tab = signal<'orders' | 'settings'>('orders');
  filter = signal<OrderFilter>('active');
  completeMethod: SalePaymentMethod = 'PIX';
  form: DeliverySettingsRequest = this.emptyForm();

  visibleOrders = computed(() => {
    const filter = this.filter();
    const list = this.orders();
    return filter === 'active' ? list.filter((o) => ACTIVE.includes(o.status)) : list.filter((o) => o.status === filter);
  });
  newCount = computed(() => this.orders().filter((o) => o.status === 'RECEIVED').length);
  storeUrl = computed(() => `${location.origin}/pedir/${this.settings()?.slug ?? ''}`);

  ngOnInit(): void {
    this.deliveryService.getSettings().subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.loading.set(false);
        if (!settings.enabled && this.canManage) this.tab.set('settings');
        this.startPolling();
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Não foi possível carregar o delivery.', 'OK', { duration: 4000 });
      },
    });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
  }

  setFilter(filter: OrderFilter): void {
    this.filter.set(filter);
  }

  statusLabel(status: DeliveryOrderStatus): string {
    return STATUS_LABELS[status];
  }

  paymentLabel(method: DeliveryPaymentMethod): string {
    return PAYMENT_LABELS[method];
  }

  money(value: number | null | undefined): string {
    return brl(value);
  }

  phone(value: string): string {
    return formatPhone(value);
  }

  isActive(order: DeliveryOrder): boolean {
    return ACTIVE.includes(order.status);
  }

  customerWhatsapp(order: DeliveryOrder): string {
    const name = order.customerName.split(' ')[0];
    const store = this.settings()?.storeName ?? '';
    const messages: Record<DeliveryOrderStatus, string> = {
      RECEIVED: `Olá, ${name}! Recebemos seu pedido #${order.number} aqui na ${store}.`,
      ACCEPTED: `Olá, ${name}! Seu pedido #${order.number} foi aceito e já está sendo separado.`,
      DISPATCHED:
        order.fulfillment === 'DELIVERY'
          ? `Olá, ${name}! Seu pedido #${order.number} saiu para entrega.`
          : `Olá, ${name}! Seu pedido #${order.number} está pronto para retirada.`,
      COMPLETED: `Olá, ${name}! Obrigado pelo pedido #${order.number}. Volte sempre!`,
      CANCELLED: `Olá, ${name}! Infelizmente precisamos cancelar o pedido #${order.number}.`,
    };
    return `https://wa.me/${order.customerPhone}?text=${encodeURIComponent(messages[order.status])}`;
  }

  shareOnWhatsapp(): string {
    const text = `Agora você pode pedir na ${this.settings()?.storeName ?? 'nossa loja'} pelo celular: ${this.storeUrl()}`;
    return `https://wa.me/?text=${encodeURIComponent(text)}`;
  }

  copyLink(): void {
    navigator.clipboard.writeText(this.storeUrl()).then(
      () => this.snackBar.open('Link copiado.', 'OK', { duration: 2500 }),
      () => this.snackBar.open(this.storeUrl(), 'OK', { duration: 6000 }),
    );
  }

  move(order: DeliveryOrder, status: DeliveryOrderStatus): void {
    if (status === 'CANCELLED' && !confirm(`Cancelar o pedido #${order.number}? Avise o cliente pelo WhatsApp.`)) return;
    this.busy.set(order.id);
    this.deliveryService.updateStatus(order.id, status).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busy.set(null);
        this.feature.refreshNewOrders();
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(null);
        this.fail(error, 'Não foi possível atualizar o pedido.');
        this.refresh();
      },
    });
  }

  startComplete(order: DeliveryOrder): void {
    this.completeMethod = order.paymentMethod === 'CASH' ? 'CASH' : order.paymentMethod === 'PIX' ? 'PIX' : 'DEBIT_CARD';
    this.completing.set(order.id);
  }

  complete(order: DeliveryOrder): void {
    this.busy.set(order.id);
    this.deliveryService.complete(order.id, this.completeMethod).subscribe({
      next: (updated) => {
        this.replace(updated);
        this.busy.set(null);
        this.completing.set(null);
        this.snackBar.open(`Pedido #${order.number} concluído e lançado no caixa.`, 'OK', { duration: 4000 });
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(null);
        this.fail(error, 'Não foi possível concluir o pedido.');
      },
    });
  }

  togglePayment(method: DeliveryPaymentMethod, checked: boolean): void {
    const current = this.form.acceptedPayments.filter((m) => m !== method);
    this.form.acceptedPayments = checked ? [...current, method] : current;
  }

  toggleOpen(): void {
    const current = this.settings();
    if (!current) return;
    this.form.open = !current.open;
    this.save();
  }

  save(): void {
    if (!this.form.deliveryAvailable && !this.form.pickupAvailable) {
      this.snackBar.open('Ative entrega, retirada ou as duas.', 'OK', { duration: 4000 });
      return;
    }
    if (this.form.acceptedPayments.length === 0) {
      this.snackBar.open('Escolha ao menos uma forma de pagamento.', 'OK', { duration: 4000 });
      return;
    }
    this.saving.set(true);
    const request: DeliverySettingsRequest = {
      ...this.form,
      open: this.form.enabled && this.form.open,
      deliveryFee: Number(this.form.deliveryFee) || 0,
      minimumOrder: Number(this.form.minimumOrder) || 0,
      estimatedMinutes: Math.round(Number(this.form.estimatedMinutes) || 40),
    };
    this.deliveryService.updateSettings(request).subscribe({
      next: (settings) => {
        this.applySettings(settings);
        this.feature.update(settings);
        this.saving.set(false);
        this.snackBar.open('Delivery salvo.', 'OK', { duration: 2500 });
        this.startPolling();
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.fail(error, 'Não foi possível salvar.');
        const current = this.settings();
        if (current) this.form.open = current.open;
      },
    });
  }

  private startPolling(): void {
    if (this.poll || !this.settings()?.enabled) return;
    this.poll = interval(20000).pipe(startWith(0)).subscribe(() => this.refresh());
  }

  private refresh(): void {
    this.deliveryService.listOrders().subscribe({
      next: (orders) => {
        const fresh = orders.filter((o) => o.status === 'RECEIVED' && !this.knownNew.has(o.id));
        if (this.orders().length > 0 && fresh.length > 0) {
          this.snackBar.open(
            fresh.length === 1 ? `Novo pedido #${fresh[0].number}!` : `${fresh.length} pedidos novos!`,
            'Ver',
            { duration: 8000, horizontalPosition: 'right', verticalPosition: 'top' },
          ).onAction().subscribe(() => {
            this.tab.set('orders');
            this.filter.set('active');
          });
        }
        orders.filter((o) => o.status === 'RECEIVED').forEach((o) => this.knownNew.add(o.id));
        this.orders.set(orders);
        this.feature.newOrders.set(orders.filter((o) => o.status === 'RECEIVED').length);
      },
      error: () => {},
    });
  }

  private replace(updated: DeliveryOrder): void {
    this.orders.update((list) => list.map((o) => (o.id === updated.id ? updated : o)));
  }

  private applySettings(settings: DeliverySettings): void {
    this.settings.set(settings);
    this.form = {
      enabled: settings.enabled,
      open: settings.open,
      whatsapp: formatPhone(settings.whatsapp),
      message: settings.message ?? '',
      deliveryFee: settings.deliveryFee ?? 0,
      minimumOrder: settings.minimumOrder ?? 0,
      estimatedMinutes: settings.estimatedMinutes || 40,
      deliveryAvailable: settings.deliveryAvailable,
      pickupAvailable: settings.pickupAvailable,
      pickupAddress: settings.pickupAddress ?? '',
      acceptedPayments: [...(settings.acceptedPayments ?? [])],
      pixKey: settings.pixKey ?? '',
    };
  }

  private emptyForm(): DeliverySettingsRequest {
    return {
      enabled: false,
      open: false,
      whatsapp: '',
      message: '',
      deliveryFee: 0,
      minimumOrder: 0,
      estimatedMinutes: 40,
      deliveryAvailable: true,
      pickupAvailable: true,
      pickupAddress: '',
      acceptedPayments: ['PIX', 'CASH', 'CARD'],
      pixKey: '',
    };
  }

  private fail(error: HttpErrorResponse, fallback: string): void {
    this.snackBar.open(error.error?.message || fallback, 'OK', { duration: 5000 });
  }
}
