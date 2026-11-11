import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Title } from '@angular/platform-browser';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import {
  DeliveryFulfillment,
  DeliveryPaymentMethod,
  DeliveryService,
  PAYMENT_LABELS,
  PlacedOrder,
  PublicProduct,
  PublicStore,
  brl,
} from './delivery.service';

interface CartLine {
  productId: string;
  quantity: number;
  notes: string;
}

interface Customer {
  name: string;
  phone: string;
  street: string;
  number: string;
  complement: string;
  district: string;
  reference: string;
}

type View = 'menu' | 'cart' | 'done';

const CUSTOMER_KEY = 'pedir:cliente';

@Component({
  selector: 'app-storefront',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="shop">
      @if (loading()) {
        <div class="center"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!store()) {
        <div class="center gone">
          <mat-icon>storefront</mat-icon>
          <h1>Cardápio indisponível</h1>
          <p>Esta loja não está recebendo pedidos pelo link no momento.</p>
        </div>
      } @else if (store(); as s) {
        <header class="hero">
          <div class="hero-inner">
            <div class="badge">{{ initials(s.name) }}</div>
            <div class="hero-text">
              <h1>{{ s.name }}</h1>
              <div class="meta">
                <span class="state" [class.open]="s.open"><i></i>{{ s.open ? 'Aberto' : 'Fechado agora' }}</span>
                <span><mat-icon>schedule</mat-icon>{{ s.estimatedMinutes }} min</span>
                @if (s.deliveryAvailable) {
                  <span><mat-icon>two_wheeler</mat-icon>{{ s.deliveryFee > 0 ? money(s.deliveryFee) : 'Entrega grátis' }}</span>
                }
                @if (s.minimumOrder > 0) { <span>Mínimo {{ money(s.minimumOrder) }}</span> }
              </div>
            </div>
          </div>
          @if (s.message) { <p class="notice">{{ s.message }}</p> }
          @if (!s.open) { <p class="notice closed">A loja está fechada. Você pode olhar o cardápio, mas os pedidos ficam para quando abrir.</p> }
        </header>

        @switch (view()) {
          @case ('menu') {
            <div class="search">
              <mat-icon>search</mat-icon>
              <input type="search" [(ngModel)]="query" name="query" placeholder="Buscar produto" aria-label="Buscar produto" />
            </div>

            @if (categories().length > 1) {
              <nav class="cats" aria-label="Categorias">
                @for (group of groups(); track group.name) {
                  <a [href]="'#cat-' + slugify(group.name)" (click)="jump($event, group.name)">{{ group.name }}</a>
                }
              </nav>
            }

            @for (group of groups(); track group.name) {
              <section class="group" [id]="'cat-' + slugify(group.name)">
                <h2>{{ group.name }}</h2>
                <ul class="products">
                  @for (product of group.items; track product.id) {
                    <li>
                      <button type="button" class="product" [disabled]="!product.available" (click)="open(product)">
                        <span class="p-name">{{ product.description }}</span>
                        <span class="p-price">{{ product.available ? money(product.price) : 'Esgotado' }}</span>
                        @if (inCart(product.id) > 0) { <span class="p-qty">{{ inCart(product.id) }}</span> }
                      </button>
                    </li>
                  }
                </ul>
              </section>
            }
            @if (groups().length === 0) {
              <p class="empty">{{ query ? 'Nenhum produto encontrado.' : 'O cardápio ainda está vazio.' }}</p>
            }
          }

          @case ('cart') {
            <section class="checkout">
              <button type="button" class="link" (click)="view.set('menu')"><mat-icon>arrow_back</mat-icon> Continuar comprando</button>
              <h2>Seu pedido</h2>
              <ul class="lines">
                @for (line of cartView(); track line.product.id) {
                  <li>
                    <div class="line-top">
                      <strong>{{ line.product.description }}</strong>
                      <span class="money">{{ money(line.product.price * line.quantity) }}</span>
                    </div>
                    <div class="line-bottom">
                      <div class="stepper">
                        <button type="button" (click)="change(line.product, -1)" aria-label="Diminuir">−</button>
                        <span>{{ line.quantity }}</span>
                        <button type="button" (click)="change(line.product, 1)" [disabled]="line.quantity >= line.product.maxQuantity" aria-label="Aumentar">+</button>
                      </div>
                      <input [(ngModel)]="line.line.notes" (ngModelChange)="persist()" [name]="'n-' + line.product.id" maxlength="140" placeholder="Observação (opcional)" />
                    </div>
                  </li>
                }
              </ul>

              <form (ngSubmit)="submit(s)" #f="ngForm">
                @if (s.deliveryAvailable && s.pickupAvailable) {
                  <div class="segmented" role="radiogroup" aria-label="Como receber">
                    <button type="button" [class.on]="fulfillment === 'DELIVERY'" (click)="fulfillment = 'DELIVERY'">Entregar</button>
                    <button type="button" [class.on]="fulfillment === 'PICKUP'" (click)="fulfillment = 'PICKUP'">Retirar na loja</button>
                  </div>
                }

                <h3>Seus dados</h3>
                <label>Nome<input [(ngModel)]="customer.name" name="name" autocomplete="name" required maxlength="80" /></label>
                <label>WhatsApp<input [(ngModel)]="customer.phone" name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="(11) 91234-5678" /></label>

                @if (fulfillment === 'DELIVERY') {
                  <h3>Endereço de entrega</h3>
                  <div class="row">
                    <label class="grow">Rua<input [(ngModel)]="customer.street" name="street" autocomplete="address-line1" required maxlength="120" /></label>
                    <label class="small">Número<input [(ngModel)]="customer.number" name="number" required maxlength="20" /></label>
                  </div>
                  <label>Bairro<input [(ngModel)]="customer.district" name="district" required maxlength="80" /></label>
                  <label>Complemento<input [(ngModel)]="customer.complement" name="complement" maxlength="80" placeholder="Apto, bloco, casa" /></label>
                  <label>Ponto de referência<input [(ngModel)]="customer.reference" name="reference" maxlength="120" /></label>
                } @else if (s.pickupAddress) {
                  <p class="pickup"><mat-icon>storefront</mat-icon> Retirar em: {{ s.pickupAddress }}</p>
                }

                <h3>Pagamento</h3>
                <div class="pay">
                  @for (method of s.acceptedPayments; track method) {
                    <button type="button" [class.on]="payment === method" (click)="payment = method">{{ paymentLabel(method) }}</button>
                  }
                </div>
                @if (payment === 'PIX' && s.pixIntegrated) {
                  <p class="fine">Você paga agora pelo QR code do Pix. O pedido só vai para a loja depois do pagamento.</p>
                }
                @if (payment === 'CASH') {
                  <label>Troco para quanto? <input [(ngModel)]="changeFor" name="changeFor" type="number" min="0" step="1" inputmode="decimal" placeholder="Deixe vazio se não precisar" /></label>
                }
                <label>Observação do pedido<textarea [(ngModel)]="notes" name="notes" rows="2" maxlength="280"></textarea></label>

                <dl class="sum">
                  <div><dt>Produtos</dt><dd>{{ money(subtotal()) }}</dd></div>
                  @if (fulfillment === 'DELIVERY') { <div><dt>Entrega</dt><dd>{{ s.deliveryFee > 0 ? money(s.deliveryFee) : 'Grátis' }}</dd></div> }
                  <div class="total"><dt>Total</dt><dd>{{ money(total()) }}</dd></div>
                </dl>

                @if (belowMinimum()) {
                  <p class="error">Faltam {{ money(s.minimumOrder - subtotal()) }} para o pedido mínimo.</p>
                }
                @if (error()) { <p class="error" role="alert">{{ error() }}</p> }

                <button type="submit" class="cta" [disabled]="sending() || !s.open || belowMinimum() || cart().length === 0">
                  {{ sending() ? 'Enviando...' : s.open ? 'Fazer pedido · ' + money(total()) : 'Loja fechada' }}
                </button>
                @if (payment === 'PIX' && s.pixIntegrated) {
                  <p class="fine">Ao enviar, mostramos o QR code do Pix. O pedido vai para a loja assim que o pagamento for confirmado.</p>
                } @else {
                  <p class="fine">Ao enviar, o pedido vai para a loja e abrimos o WhatsApp com o resumo para você confirmar.</p>
                }
              </form>
            </section>
          }

          @case ('done') {
            @if (placed(); as p) {
              <section class="done">
                <mat-icon class="ok">check_circle</mat-icon>
                <h2>Pedido #{{ p.number }} recebido!</h2>
                <p>Agora envie a mensagem no WhatsApp para a loja confirmar o seu pedido.</p>
                <a class="cta whats" [href]="p.whatsappUrl" target="_blank" rel="noopener">
                  <mat-icon>chat</mat-icon> Enviar pedido no WhatsApp
                </a>
                @if (p.pixKey) {
                  <div class="pix">
                    <span>Chave Pix da loja</span>
                    <code>{{ p.pixKey }}</code>
                    <button type="button" (click)="copy(p.pixKey!)">{{ copied() ? 'Copiada' : 'Copiar chave' }}</button>
                    <small>Valor: {{ money(p.total) }}. Mande o comprovante no WhatsApp.</small>
                  </div>
                }
                <a class="link" [routerLink]="['/pedir', s.slug, 'pedido', p.id]">Acompanhar o pedido</a>
                <button type="button" class="link" (click)="newOrder()">Fazer outro pedido</button>
              </section>
            }
          }
        }

        @if (view() === 'menu' && cartCount() > 0) {
          <button type="button" class="cart-bar" (click)="view.set('cart')">
            <span class="count">{{ cartCount() }}</span>
            <span>Ver pedido</span>
            <span class="money">{{ money(subtotal()) }}</span>
          </button>
        }

        @if (selected(); as product) {
          <div class="sheet-backdrop" (click)="selected.set(null)"></div>
          <div class="sheet" role="dialog" aria-modal="true" [attr.aria-label]="product.description">
            <h3>{{ product.description }}</h3>
            <p class="money big">{{ money(product.price) }}</p>
            <label>Observação<input [(ngModel)]="draftNotes" name="draftNotes" maxlength="140" placeholder="Ex.: bem gelada, sem cebola" /></label>
            <div class="sheet-actions">
              <div class="stepper">
                <button type="button" (click)="draftQty = draftQty > 1 ? draftQty - 1 : 1" aria-label="Diminuir">−</button>
                <span>{{ draftQty }}</span>
                <button type="button" (click)="draftQty = draftQty < product.maxQuantity ? draftQty + 1 : draftQty" aria-label="Aumentar">+</button>
              </div>
              <button type="button" class="cta" (click)="add(product)">Adicionar · {{ money(product.price * draftQty) }}</button>
            </div>
          </div>
        }

        <footer class="made">Pedidos online por <a href="https://www.binitechpdv.com.br" target="_blank" rel="noopener">BiniTech PDV</a></footer>
      }
    </div>
  `,
  styles: [`
    :host { display:block; background:var(--bg); min-height:100vh; }
    .shop { max-width:640px; margin:0 auto; padding:0 0 120px; color:var(--text); }
    .center { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:70vh; padding:24px; text-align:center; }
    .gone mat-icon { font-size:56px; width:56px; height:56px; color:var(--primary); }
    .hero { background:var(--header-bg); color:var(--header-text); padding:28px 16px 18px; }
    .hero-inner { display:flex; gap:14px; align-items:center; }
    .badge { flex:none; width:64px; height:64px; border-radius:50%; background:var(--primary); color:#fff; display:grid; place-items:center;
      font-family:var(--font-display); font-weight:800; font-size:24px; border:3px solid var(--header-text); }
    .hero h1 { font-family:var(--font-display); font-size:26px; line-height:1.1; margin:0 0 8px; letter-spacing:-.5px; text-wrap:balance; }
    .meta { display:flex; flex-wrap:wrap; gap:6px 14px; font-size:13.5px; opacity:.92; }
    .meta span { display:inline-flex; align-items:center; gap:4px; }
    .meta mat-icon { font-size:16px; width:16px; height:16px; }
    .state { font-weight:700; color:#ff9b85; }
    .state.open { color:#8fd6a8; }
    .state i { width:8px; height:8px; border-radius:50%; background:currentColor; }
    .notice { margin:14px 0 0; padding:10px 12px; border-radius:var(--radius-md); background:rgba(255,255,255,.08); font-size:14px; }
    .notice.closed { background:rgba(212,57,26,.25); }
    .search { position:relative; margin:16px 16px 8px; }
    .search mat-icon { position:absolute; left:12px; top:50%; transform:translateY(-50%); color:var(--text-tertiary); }
    .search input { width:100%; box-sizing:border-box; padding:12px 12px 12px 42px; border:1.5px solid var(--input-border); border-radius:100px;
      background:var(--input-bg); color:var(--text); font:inherit; font-size:15px; }
    .cats { position:sticky; top:0; z-index:5; display:flex; gap:8px; overflow-x:auto; padding:10px 16px; background:var(--bg);
      border-bottom:1px solid var(--border); scrollbar-width:none; }
    .cats a { flex:none; padding:6px 14px; border-radius:100px; border:1.5px solid var(--border); color:var(--text); text-decoration:none;
      font-size:13.5px; font-weight:600; background:var(--surface); }
    .group { padding:8px 16px 4px; scroll-margin-top:56px; }
    .group h2 { font-family:var(--font-display); font-size:19px; margin:14px 0 8px; }
    .products { list-style:none; margin:0; padding:0; display:flex; flex-direction:column; gap:8px; }
    .product { width:100%; display:grid; grid-template-columns:1fr auto; align-items:center; gap:4px 12px; text-align:left; padding:14px;
      background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-lg); font:inherit; color:var(--text); cursor:pointer; position:relative; }
    .product:not(:disabled):hover { border-color:var(--text); }
    .product:disabled { opacity:.55; cursor:not-allowed; }
    .p-name { font-weight:600; font-size:15px; }
    .p-price { font-weight:700; color:var(--success); font-variant-numeric:tabular-nums; }
    .product:disabled .p-price { color:var(--text-tertiary); }
    .p-qty { position:absolute; top:-8px; left:-6px; background:var(--primary); color:#fff; border-radius:100px; font-size:12px; font-weight:700; padding:1px 8px; }
    .empty { text-align:center; color:var(--text-secondary); padding:32px 16px; }
    .cart-bar { position:fixed; left:50%; transform:translateX(-50%); bottom:calc(16px + env(safe-area-inset-bottom, 0px)); width:min(608px, calc(100% - 32px));
      display:flex; align-items:center; gap:12px; padding:14px 18px; border:none; border-radius:var(--radius-lg); background:var(--primary); color:#fff;
      font:inherit; font-weight:700; font-size:16px; box-shadow:var(--shadow-lg); cursor:pointer; z-index:10; }
    .cart-bar .count { background:rgba(255,255,255,.25); border-radius:100px; padding:2px 10px; }
    .cart-bar .money { margin-left:auto; }
    .checkout, .done { padding:16px; }
    .checkout h2, .done h2 { font-family:var(--font-display); font-size:22px; margin:10px 0 12px; }
    .checkout h3 { font-size:15px; margin:20px 0 8px; }
    .link { display:inline-flex; align-items:center; gap:4px; background:none; border:none; padding:6px 0; color:var(--primary-text);
      font:inherit; font-weight:600; cursor:pointer; text-decoration:none; }
    .lines { list-style:none; padding:0; margin:0; display:flex; flex-direction:column; gap:10px; }
    .lines li { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-lg); padding:12px; }
    .line-top { display:flex; justify-content:space-between; gap:8px; }
    .line-bottom { display:flex; gap:10px; align-items:center; margin-top:10px; }
    .line-bottom input { flex:1; min-width:0; }
    .stepper { display:inline-flex; align-items:center; border:1.5px solid var(--text); border-radius:100px; overflow:hidden; flex:none; }
    .stepper button { width:36px; height:36px; border:none; background:var(--surface); color:var(--text); font-size:20px; cursor:pointer; }
    .stepper button:disabled { opacity:.4; }
    .stepper span { min-width:28px; text-align:center; font-weight:700; }
    label { display:flex; flex-direction:column; gap:4px; font-size:13.5px; font-weight:600; color:var(--text-secondary); margin-bottom:10px; }
    input, textarea { box-sizing:border-box; width:100%; padding:11px 12px; border:1.5px solid var(--input-border); border-radius:var(--radius-md);
      background:var(--input-bg); color:var(--text); font:inherit; font-size:16px; font-weight:400; }
    input:focus, textarea:focus, button:focus-visible { outline:2px solid var(--primary); outline-offset:1px; }
    .row { display:flex; gap:10px; }
    .row .grow { flex:1; }
    .row .small { width:110px; }
    .segmented, .pay { display:flex; gap:8px; flex-wrap:wrap; margin:12px 0 4px; }
    .segmented button, .pay button { flex:1; min-width:110px; padding:11px; border:1.5px solid var(--border); border-radius:var(--radius-md);
      background:var(--surface); color:var(--text); font:inherit; font-weight:600; cursor:pointer; }
    .segmented button.on, .pay button.on { border-color:var(--text); background:var(--text); color:var(--bg); }
    .pickup { display:flex; gap:6px; align-items:center; color:var(--text-secondary); font-size:14px; }
    .sum { margin:16px 0 8px; display:flex; flex-direction:column; gap:6px; }
    .sum div { display:flex; justify-content:space-between; }
    .sum dt { color:var(--text-secondary); }
    .sum dd { margin:0; font-variant-numeric:tabular-nums; }
    .sum .total dt, .sum .total dd { font-weight:800; font-size:18px; color:var(--text); }
    .error { color:var(--danger); font-weight:600; font-size:14px; }
    .cta { display:flex; justify-content:center; align-items:center; gap:8px; width:100%; padding:15px; border:none; border-radius:var(--radius-lg);
      background:var(--primary); color:#fff; font:inherit; font-weight:800; font-size:16px; cursor:pointer; text-decoration:none; }
    .cta:disabled { opacity:.5; cursor:not-allowed; }
    .cta.whats { background:#1f8f4e; margin:18px 0 10px; }
    .fine { font-size:12.5px; color:var(--text-tertiary); text-align:center; }
    .done { text-align:center; display:flex; flex-direction:column; align-items:center; }
    .done .ok { font-size:64px; width:64px; height:64px; color:var(--success); margin-top:20px; }
    .done p { color:var(--text-secondary); max-width:420px; }
    .pix { width:100%; box-sizing:border-box; display:flex; flex-direction:column; gap:6px; align-items:center; padding:16px; margin:8px 0 12px;
      border:1.5px dashed var(--border); border-radius:var(--radius-lg); background:var(--surface); }
    .pix code { font-family:var(--font-mono); font-size:15px; word-break:break-all; }
    .pix button { border:1.5px solid var(--text); background:none; color:var(--text); border-radius:100px; padding:6px 16px; font:inherit; font-weight:600; cursor:pointer; }
    .pix small { color:var(--text-secondary); }
    .sheet-backdrop { position:fixed; inset:0; background:rgba(20,12,6,.5); z-index:20; }
    .sheet { position:fixed; left:50%; transform:translateX(-50%); bottom:0; width:min(640px, 100%); box-sizing:border-box; z-index:21;
      background:var(--bg); border-radius:16px 16px 0 0; padding:20px 16px calc(20px + env(safe-area-inset-bottom, 0px)); box-shadow:var(--shadow-lg); }
    .sheet h3 { font-family:var(--font-display); font-size:20px; margin:0 0 4px; }
    .big { font-size:18px; font-weight:800; color:var(--success); margin:0 0 14px; }
    .sheet-actions { display:flex; gap:12px; align-items:center; }
    .money { font-variant-numeric:tabular-nums; }
    .made { text-align:center; font-size:12.5px; color:var(--text-tertiary); padding:24px 16px; }
    .made a { color:var(--text-secondary); }
    @media (prefers-reduced-motion: no-preference) { .sheet { animation:up .18s ease-out; } @keyframes up { from { transform:translate(-50%, 30px); opacity:0; } } }
  `],
})
export class StorefrontComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly deliveryService = inject(DeliveryService);
  private readonly title = inject(Title);

  store = signal<PublicStore | null>(null);
  loading = signal(true);
  view = signal<View>('menu');
  cart = signal<CartLine[]>([]);
  selected = signal<PublicProduct | null>(null);
  placed = signal<PlacedOrder | null>(null);
  sending = signal(false);
  error = signal('');
  copied = signal(false);
  queryValue = signal('');

  draftQty = 1;
  draftNotes = '';
  fulfillment: DeliveryFulfillment = 'DELIVERY';
  payment: DeliveryPaymentMethod = 'PIX';
  changeFor: number | null = null;
  notes = '';
  customer: Customer = { name: '', phone: '', street: '', number: '', complement: '', district: '', reference: '' };
  private slug = '';

  get query(): string {
    return this.queryValue();
  }

  set query(value: string) {
    this.queryValue.set(value ?? '');
  }

  categories = computed(() => [...new Set((this.store()?.products ?? []).map((p) => p.category))]);

  groups = computed(() => {
    const term = this.normalize(this.queryValue());
    const products = (this.store()?.products ?? []).filter((p) => !term || this.normalize(p.description).includes(term));
    const map = new Map<string, PublicProduct[]>();
    for (const product of products) {
      map.set(product.category, [...(map.get(product.category) ?? []), product]);
    }
    return [...map.entries()].map(([name, items]) => ({
      name,
      items: [...items].sort((a, b) => Number(b.available) - Number(a.available)),
    }));
  });

  cartView = computed(() => {
    const byId = new Map((this.store()?.products ?? []).map((p) => [p.id, p]));
    return this.cart()
      .map((line) => ({ line, product: byId.get(line.productId)!, quantity: line.quantity }))
      .filter((l) => !!l.product);
  });

  cartCount = computed(() => this.cartView().reduce((sum, l) => sum + l.quantity, 0));
  subtotal = computed(() => this.round(this.cartView().reduce((sum, l) => sum + l.product.price * l.quantity, 0)));

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.restoreCustomer();
    this.deliveryService.getStore(this.slug).subscribe({
      next: (store) => {
        this.store.set(store);
        this.title.setTitle(`${store.name} | Peça online`);
        this.fulfillment = store.deliveryAvailable ? 'DELIVERY' : 'PICKUP';
        this.payment = store.acceptedPayments[0] ?? 'PIX';
        this.restoreCart(store);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  total(): number {
    const store = this.store();
    const fee = store && this.fulfillment === 'DELIVERY' ? store.deliveryFee : 0;
    return this.round(this.subtotal() + fee);
  }

  belowMinimum(): boolean {
    const store = this.store();
    return !!store && store.minimumOrder > 0 && this.subtotal() < store.minimumOrder;
  }

  inCart(productId: string): number {
    return this.cart().find((l) => l.productId === productId)?.quantity ?? 0;
  }

  open(product: PublicProduct): void {
    const line = this.cart().find((l) => l.productId === product.id);
    this.draftQty = line?.quantity ?? 1;
    this.draftNotes = line?.notes ?? '';
    this.selected.set(product);
  }

  add(product: PublicProduct): void {
    const quantity = Math.min(this.draftQty, product.maxQuantity);
    this.cart.update((lines) => {
      const rest = lines.filter((l) => l.productId !== product.id);
      return [...rest, { productId: product.id, quantity, notes: this.draftNotes.trim() }];
    });
    this.selected.set(null);
    this.persist();
  }

  change(product: PublicProduct, delta: number): void {
    this.cart.update((lines) =>
      lines
        .map((l) => (l.productId === product.id ? { ...l, quantity: Math.min(product.maxQuantity, l.quantity + delta) } : l))
        .filter((l) => l.quantity > 0),
    );
    if (this.cart().length === 0) this.view.set('menu');
    this.persist();
  }

  submit(store: PublicStore): void {
    this.error.set('');
    const problem = this.validate();
    if (problem) {
      this.error.set(problem);
      return;
    }
    this.sending.set(true);
    this.saveCustomer();
    this.deliveryService
      .placeOrder(store.slug, {
        customerName: this.customer.name.trim(),
        customerPhone: this.customer.phone,
        fulfillment: this.fulfillment,
        address:
          this.fulfillment === 'DELIVERY'
            ? {
                street: this.customer.street.trim(),
                number: this.customer.number.trim(),
                complement: this.customer.complement.trim() || null,
                district: this.customer.district.trim(),
                reference: this.customer.reference.trim() || null,
              }
            : null,
        paymentMethod: this.payment,
        changeFor: this.payment === 'CASH' && this.changeFor ? Number(this.changeFor) : null,
        notes: this.notes.trim() || null,
        items: this.cart().map((l) => ({ productId: l.productId, quantity: l.quantity, notes: l.notes || null })),
      })
      .subscribe({
        next: (placed) => {
          this.sending.set(false);
          this.placed.set(placed);
          this.cart.set([]);
          this.notes = '';
          this.changeFor = null;
          this.persist();
          if (placed.status === 'AWAITING_PAYMENT') {
            void this.router.navigate(['/pedir', store.slug, 'pedido', placed.id]);
            return;
          }
          this.view.set('done');
          window.scrollTo({ top: 0 });
        },
        error: (error: HttpErrorResponse) => {
          this.sending.set(false);
          this.error.set(
            error.status === 429
              ? 'Você enviou vários pedidos seguidos. Espere alguns minutos e tente de novo.'
              : error.error?.message || 'Não foi possível enviar o pedido. Tente de novo.',
          );
          if (error.status === 400) this.reloadStore();
        },
      });
  }

  newOrder(): void {
    this.placed.set(null);
    this.view.set('menu');
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text).then(() => this.copied.set(true), () => {});
  }

  persist(): void {
    try {
      localStorage.setItem(this.cartKey(), JSON.stringify(this.cart()));
    } catch {}
  }

  jump(event: Event, name: string): void {
    event.preventDefault();
    document.getElementById('cat-' + this.slugify(name))?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  money(value: number | null | undefined): string {
    return brl(value);
  }

  paymentLabel(method: DeliveryPaymentMethod): string {
    return PAYMENT_LABELS[method];
  }

  initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('');
  }

  slugify(value: string): string {
    return this.normalize(value).replace(/[^a-z0-9]+/g, '-');
  }

  private validate(): string | null {
    const c = this.customer;
    if (c.name.trim().length < 2) return 'Informe seu nome.';
    const digits = c.phone.replace(/\D/g, '').replace(/^55(?=\d{10,11}$)/, '');
    if (digits.length < 10 || digits.length > 11) return 'Informe seu WhatsApp com DDD.';
    if (this.fulfillment === 'DELIVERY' && (!c.street.trim() || !c.number.trim() || !c.district.trim())) {
      return 'Preencha rua, número e bairro para a entrega.';
    }
    if (this.payment === 'CASH' && this.changeFor && Number(this.changeFor) < this.total()) {
      return `O troco precisa ser para um valor maior que ${this.money(this.total())}.`;
    }
    return null;
  }

  private reloadStore(): void {
    this.deliveryService.getStore(this.slug).subscribe({
      next: (store) => {
        this.store.set(store);
        this.restoreCart(store);
      },
      error: () => {},
    });
  }

  private restoreCart(store: PublicStore): void {
    try {
      const saved = JSON.parse(localStorage.getItem(this.cartKey()) ?? '[]') as CartLine[];
      const byId = new Map(store.products.map((p) => [p.id, p]));
      this.cart.set(
        saved
          .filter((l) => byId.get(l.productId)?.available)
          .map((l) => ({ ...l, quantity: Math.min(l.quantity, byId.get(l.productId)!.maxQuantity) })),
      );
    } catch {
      this.cart.set([]);
    }
  }

  private restoreCustomer(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(CUSTOMER_KEY) ?? 'null') as Customer | null;
      if (saved) this.customer = { ...this.customer, ...saved };
    } catch {}
  }

  private saveCustomer(): void {
    try {
      localStorage.setItem(CUSTOMER_KEY, JSON.stringify(this.customer));
    } catch {}
  }

  private cartKey(): string {
    return `pedir:${this.slug}:carrinho`;
  }

  private normalize(value: string): string {
    return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
  }

  private round(value: number): number {
    return Math.round(value * 100) / 100;
  }
}
