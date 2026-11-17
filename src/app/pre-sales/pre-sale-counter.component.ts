import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ProductService } from '../pos/services/product.service';
import { AuthService } from '../auth/services/auth.service';
import { PreSaleDTO, ProductDTO } from '../shared/models/api.models';
import { buildPreSaleTicket, printMatrix } from '../shared/receipt/matrix-receipt';
import { PreSaleService } from './pre-sale.service';

interface DraftLine {
  productId: string;
  description: string;
  unitPrice: number;
  quantity: number;
}

const AUTO_PRINT_KEY = 'binitech-comanda-auto-print';
const MAX_QUANTITY = 999;

@Component({
  selector: 'app-pre-sale-counter',
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Comandas</h1>
          <p>Lance o pedido no balcão e entregue o número ao cliente. O pagamento é feito no caixa.</p>
        </div>
        <label class="auto-print">
          <input type="checkbox" [ngModel]="autoPrint()" (ngModelChange)="setAutoPrint($event)" />
          Imprimir ao gerar
        </label>
      </header>

      <p class="error" *ngIf="error()" role="alert">{{ error() }}</p>

      @if (created(); as done) {
        <section class="created" aria-live="polite">
          <span class="created-label">Comanda</span>
          <strong class="created-number">{{ done.number }}</strong>
          <span class="created-total">{{ done.items.length }} {{ done.items.length === 1 ? 'item' : 'itens' }} · R$ {{ done.total | number: '1.2-2' }}</span>
          <div class="created-actions">
            <button mat-stroked-button type="button" (click)="print(done)">
              <mat-icon>print</mat-icon> Imprimir
            </button>
            <button mat-flat-button color="primary" type="button" (click)="startNew()">
              <mat-icon>add</mat-icon> Nova comanda
            </button>
          </div>
        </section>
      } @else {
        <section class="draft">
          <div class="search">
            <mat-icon aria-hidden="true">search</mat-icon>
            <input
              type="text"
              inputmode="search"
              placeholder="Buscar produto pelo nome ou código"
              aria-label="Buscar produto"
              [ngModel]="query()"
              (ngModelChange)="query.set($event)"
              (keydown.enter)="addFirstMatch()"
              autocomplete="off" />
          </div>

          @if (matches().length > 0) {
            <ul class="matches" role="list">
              @for (product of matches(); track product.id) {
                <li>
                  <button type="button" class="match" (click)="add(product)">
                    <span class="match-name">{{ product.description }}</span>
                    <span class="match-price">R$ {{ product.price | number: '1.2-2' }}</span>
                  </button>
                </li>
              }
            </ul>
          } @else if (query().trim().length >= 2) {
            <p class="hint">Nenhum produto encontrado.</p>
          }

          @if (lines().length === 0) {
            <p class="empty">Nenhum produto na comanda ainda.</p>
          } @else {
            <ul class="lines" role="list">
              @for (line of lines(); track line.productId) {
                <li class="line">
                  <div class="line-info">
                    <span class="line-name">{{ line.description }}</span>
                    <span class="line-price">R$ {{ line.unitPrice | number: '1.2-2' }} cada</span>
                  </div>
                  <div class="stepper">
                    <button type="button" [attr.aria-label]="'Diminuir ' + line.description" (click)="change(line, -1)">
                      <mat-icon>remove</mat-icon>
                    </button>
                    <span class="qty">{{ line.quantity }}</span>
                    <button type="button" [attr.aria-label]="'Aumentar ' + line.description" (click)="change(line, 1)">
                      <mat-icon>add</mat-icon>
                    </button>
                  </div>
                  <span class="line-total">R$ {{ line.unitPrice * line.quantity | number: '1.2-2' }}</span>
                </li>
              }
            </ul>
          }

          <label class="notes">
            <span>Observação</span>
            <textarea rows="2" maxlength="280" [ngModel]="notes()" (ngModelChange)="notes.set($event)"
                      placeholder="Ex.: fatiar fino, sem gordura"></textarea>
          </label>

          <div class="footer">
            <div class="total">
              <span>Total</span>
              <strong>R$ {{ total() | number: '1.2-2' }}</strong>
            </div>
            <div class="footer-actions">
              <button mat-stroked-button type="button" (click)="clear()" [disabled]="lines().length === 0 || saving()">
                Limpar
              </button>
              <button mat-flat-button color="primary" type="button" class="generate"
                      (click)="generate()" [disabled]="lines().length === 0 || saving()">
                <mat-icon>confirmation_number</mat-icon>
                {{ saving() ? 'Gerando...' : 'Gerar comanda' }}
              </button>
            </div>
          </div>
        </section>
      }

      <section class="open-list">
        <div class="open-head">
          <h2>Comandas abertas</h2>
          <button mat-button type="button" (click)="loadOpen()" [disabled]="loadingOpen()">
            <mat-icon>refresh</mat-icon> Atualizar
          </button>
        </div>
        @if (open().length === 0) {
          <p class="hint">{{ loadingOpen() ? 'Carregando...' : 'Nenhuma comanda esperando pagamento.' }}</p>
        } @else {
          <ul class="open-items" role="list">
            @for (preSale of open(); track preSale.id) {
              <li class="open-item">
                <strong class="open-number">#{{ preSale.number }}</strong>
                <div class="open-info">
                  <span>R$ {{ preSale.total | number: '1.2-2' }} · {{ preSale.items.length }} {{ preSale.items.length === 1 ? 'item' : 'itens' }}</span>
                  <span class="open-meta">{{ preSale.attendantName }} · {{ preSale.createdAt | date: 'HH:mm' }}</span>
                </div>
                <button mat-icon-button type="button" [attr.aria-label]="'Imprimir comanda ' + preSale.number" (click)="print(preSale)">
                  <mat-icon>print</mat-icon>
                </button>
                <button mat-icon-button type="button" [attr.aria-label]="'Cancelar comanda ' + preSale.number"
                        (click)="cancel(preSale)" [disabled]="cancelling() === preSale.id">
                  <mat-icon>close</mat-icon>
                </button>
              </li>
            }
          </ul>
        }
      </section>
    </div>
  `,
  styles: [`
    .page { padding: 16px; max-width: 760px; margin: 0 auto; display: grid; gap: 16px; }
    .page-header { display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; flex-wrap: wrap; }
    h1 { margin: 0; font-size: 24px; color: var(--text); }
    h2 { margin: 0; font-size: 16px; color: var(--text); }
    .page-header p { margin: 4px 0 0; color: var(--text-secondary); max-width: 52ch; }
    .auto-print { display: inline-flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 14px; cursor: pointer; }
    .error { margin: 0; color: var(--danger); }
    .hint, .empty { margin: 0; color: var(--text-secondary); font-size: 14px; }
    .empty { padding: 20px 0; text-align: center; }
    .draft, .created, .open-list { border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); padding: 16px; display: grid; gap: 12px; }
    .search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--border); border-radius: var(--radius); padding: 0 12px; background: var(--surface-alt); }
    .search mat-icon { color: var(--text-secondary); }
    .search input { flex: 1; min-width: 0; border: 0; background: transparent; color: var(--text); font: inherit; font-size: 16px; padding: 14px 0; outline: none; }
    .search:focus-within { border-color: var(--primary); }
    .matches, .lines, .open-items { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
    .match { width: 100%; display: flex; justify-content: space-between; gap: 12px; padding: 12px 14px; border: 1px solid var(--border); border-radius: var(--radius); background: var(--surface); color: var(--text); font: inherit; text-align: left; cursor: pointer; min-height: 48px; }
    .match:hover, .match:focus-visible { border-color: var(--primary); outline: none; }
    .match-name { overflow: hidden; text-overflow: ellipsis; }
    .match-price, .line-total, .qty, .total strong, .open-number { font-family: var(--font-mono); font-variant-numeric: tabular-nums; }
    .line { display: grid; grid-template-columns: 1fr auto auto; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .line-info { display: grid; gap: 2px; min-width: 0; }
    .line-name { color: var(--text); font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
    .line-price { color: var(--text-secondary); font-size: 13px; }
    .line-total { color: var(--text); min-width: 80px; text-align: right; }
    .stepper { display: inline-flex; align-items: center; border: 1px solid var(--border); border-radius: var(--radius); }
    .stepper button { width: 44px; height: 44px; display: grid; place-items: center; border: 0; background: transparent; color: var(--text); cursor: pointer; }
    .stepper button:focus-visible { outline: 2px solid var(--primary); outline-offset: -2px; }
    .qty { min-width: 32px; text-align: center; color: var(--text); font-weight: 600; }
    .notes { display: grid; gap: 4px; color: var(--text-secondary); font-size: 13px; }
    .notes textarea { font: inherit; font-size: 15px; color: var(--text); background: var(--surface-alt); border: 1px solid var(--border); border-radius: var(--radius); padding: 10px 12px; resize: vertical; }
    .notes textarea:focus { outline: none; border-color: var(--primary); }
    .footer { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
    .total { display: grid; }
    .total span { color: var(--text-secondary); font-size: 13px; }
    .total strong { font-size: 24px; color: var(--text); }
    .footer-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .generate { min-height: 48px; font-size: 16px; }
    .created { justify-items: center; text-align: center; padding: 28px 16px; }
    .created-label { color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; font-size: 13px; }
    .created-number { font-family: var(--font-mono); font-size: clamp(72px, 22vw, 120px); line-height: 1; color: var(--primary); }
    .created-total { color: var(--text); }
    .created-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: center; margin-top: 8px; }
    .created-actions button { min-height: 48px; }
    .open-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
    .open-item { display: grid; grid-template-columns: auto 1fr auto auto; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--border); }
    .open-number { font-size: 20px; color: var(--text); min-width: 56px; }
    .open-info { display: grid; gap: 2px; color: var(--text); min-width: 0; }
    .open-meta { color: var(--text-secondary); font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    @media (max-width: 520px) {
      .line { grid-template-columns: 1fr auto; }
      .line-total { grid-column: 1 / -1; text-align: left; min-width: 0; }
      .footer-actions { width: 100%; }
      .footer-actions button { flex: 1; }
    }
  `],
})
export class PreSaleCounterComponent implements OnInit {
  private readonly productService = inject(ProductService);
  private readonly preSales = inject(PreSaleService);
  private readonly auth = inject(AuthService);

  private readonly products = signal<ProductDTO[]>([]);
  readonly query = signal('');
  readonly lines = signal<DraftLine[]>([]);
  readonly notes = signal('');
  readonly saving = signal(false);
  readonly error = signal('');
  readonly created = signal<PreSaleDTO | null>(null);
  readonly open = signal<PreSaleDTO[]>([]);
  readonly loadingOpen = signal(false);
  readonly cancelling = signal<string | null>(null);
  readonly autoPrint = signal(readAutoPrint());

  readonly matches = computed(() => {
    const term = this.query().trim().toLowerCase();
    if (term.length < 2) return [];
    return this.products()
      .filter(p => p.description?.toLowerCase().includes(term) || p.barcode?.includes(term))
      .slice(0, 8);
  });

  readonly total = computed(() =>
    this.lines().reduce((sum, line) => sum + Math.round(line.unitPrice * 100) * line.quantity, 0) / 100,
  );

  ngOnInit(): void {
    this.productService.listAllPages().subscribe({
      next: products => this.products.set(products.filter(p => p.active !== false)),
      error: () => this.error.set('Não foi possível carregar os produtos.'),
    });
    this.loadOpen();
  }

  add(product: ProductDTO): void {
    if (!product.id) return;
    const existing = this.lines().find(line => line.productId === product.id);
    if (existing) {
      this.change(existing, 1);
    } else {
      this.lines.update(lines => [
        ...lines,
        { productId: product.id!, description: product.description ?? '', unitPrice: product.price ?? 0, quantity: 1 },
      ]);
    }
    this.query.set('');
  }

  addFirstMatch(): void {
    const term = this.query().trim();
    const exact = this.products().find(p => p.barcode === term);
    const product = exact ?? this.matches()[0];
    if (product) this.add(product);
  }

  change(line: DraftLine, delta: number): void {
    const quantity = Math.min(MAX_QUANTITY, line.quantity + delta);
    this.lines.update(lines =>
      quantity < 1
        ? lines.filter(item => item.productId !== line.productId)
        : lines.map(item => (item.productId === line.productId ? { ...item, quantity } : item)),
    );
  }

  clear(): void {
    this.lines.set([]);
    this.notes.set('');
    this.error.set('');
  }

  generate(): void {
    if (this.lines().length === 0 || this.saving()) return;
    this.saving.set(true);
    this.error.set('');
    const notes = this.notes().trim();
    this.preSales
      .create({
        items: this.lines().map(line => ({ productId: line.productId, quantity: line.quantity })),
        ...(notes ? { notes } : {}),
      })
      .subscribe({
        next: preSale => {
          this.saving.set(false);
          this.created.set(preSale);
          this.clear();
          this.open.update(list => [preSale, ...list]);
          if (this.autoPrint()) this.print(preSale);
        },
        error: err => {
          this.saving.set(false);
          this.error.set(err.error?.message || 'Não foi possível gerar a comanda.');
        },
      });
  }

  startNew(): void {
    this.created.set(null);
  }

  print(preSale: PreSaleDTO): void {
    printMatrix(
      buildPreSaleTicket(preSale, { operator: this.auth.getUsername() }),
      `Comanda ${preSale.number}`,
    );
  }

  loadOpen(): void {
    this.loadingOpen.set(true);
    this.preSales.list('OPEN').subscribe({
      next: list => {
        this.loadingOpen.set(false);
        this.open.set(list);
      },
      error: () => {
        this.loadingOpen.set(false);
        this.error.set('Não foi possível carregar as comandas abertas.');
      },
    });
  }

  cancel(preSale: PreSaleDTO): void {
    if (!window.confirm(`Cancelar a comanda #${preSale.number}?`)) return;
    this.cancelling.set(preSale.id);
    this.preSales.cancel(preSale.id).subscribe({
      next: () => {
        this.cancelling.set(null);
        this.open.update(list => list.filter(item => item.id !== preSale.id));
        if (this.created()?.id === preSale.id) this.created.set(null);
      },
      error: err => {
        this.cancelling.set(null);
        this.error.set(err.error?.message || 'Não foi possível cancelar a comanda.');
        this.loadOpen();
      },
    });
  }

  setAutoPrint(value: boolean): void {
    this.autoPrint.set(value);
    try {
      localStorage.setItem(AUTO_PRINT_KEY, value ? '1' : '0');
    } catch {
      return;
    }
  }
}

function readAutoPrint(): boolean {
  try {
    return localStorage.getItem(AUTO_PRINT_KEY) === '1';
  } catch {
    return false;
  }
}
