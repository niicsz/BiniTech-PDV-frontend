import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, switchMap, timer } from 'rxjs';
import { DeliveryOrderStatus, DeliveryService, PAYMENT_LABELS, PlacedOrder, brl } from './delivery.service';

interface Step {
  status: DeliveryOrderStatus;
  label: string;
}

@Component({
  selector: 'app-order-tracking',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="track">
      @if (loading()) {
        <div class="center"><mat-spinner diameter="40"></mat-spinner></div>
      } @else if (!order()) {
        <div class="center">
          <mat-icon class="big">search_off</mat-icon>
          <h1>Pedido não encontrado</h1>
          <a [routerLink]="['/pedir', slug]">Voltar ao cardápio</a>
        </div>
      } @else if (order(); as o) {
        <h1>Pedido #{{ o.number }}</h1>
        <p class="when">Feito em {{ o.createdAt | date: 'dd/MM/yyyy HH:mm' }}</p>

        @if (o.status === 'AWAITING_PAYMENT') {
          <section class="pay">
            <h2>Pague com Pix para enviar o pedido</h2>
            <p>O pedido só vai para a loja depois que o pagamento de <strong>{{ money(o.total) }}</strong> for confirmado.</p>
            @if (o.pix; as pix) {
              @if (pix.qrCodeBase64) {
                <img [src]="'data:image/png;base64,' + pix.qrCodeBase64" alt="QR code do Pix" width="220" height="220" />
              }
              <code>{{ pix.qrCode }}</code>
              <button type="button" (click)="copy(pix.qrCode)">{{ copied() ? 'Código copiado' : 'Copiar código Pix' }}</button>
              <small>{{ remaining() }}</small>
            } @else {
              <mat-spinner diameter="32"></mat-spinner>
              <small>Conferindo o pagamento...</small>
            }
          </section>
        } @else if (o.status === 'CANCELLED') {
          <p class="cancelled">
            <mat-icon>cancel</mat-icon>
            @if (o.paymentMethod === 'PIX' && !o.paid && !o.whatsappUrl) {
              O Pix não foi pago a tempo e o pedido foi cancelado. Faça um novo pedido.
            } @else {
              Este pedido foi cancelado pela loja.
            }
          </p>
        } @else {
          @if (o.paid) {
            <p class="paid"><mat-icon>verified</mat-icon> Pagamento por Pix confirmado.</p>
          }
          <ol class="steps">
            @for (step of steps(o.fulfillment); track step.status; let i = $index) {
              <li [class.done]="reached(o.status, i)" [class.current]="current(o.status, i)">
                <span class="dot">@if (reached(o.status, i)) { <mat-icon>check</mat-icon> }</span>
                <span>{{ step.label }}</span>
              </li>
            }
          </ol>
        }

        <section class="box">
          <ul>
            @for (item of o.items; track $index) {
              <li><span>{{ item.quantity }}x {{ item.description }}</span><span class="money">{{ money(item.subtotal) }}</span></li>
            }
          </ul>
          @if (o.fulfillment === 'DELIVERY') {
            <div class="row"><span>Entrega</span><span class="money">{{ money(o.deliveryFee) }}</span></div>
          }
          <div class="row total"><span>Total</span><span class="money">{{ money(o.total) }}</span></div>
          <div class="row"><span>Pagamento</span><span>{{ payment(o) }}</span></div>
        </section>

        @if (o.whatsappUrl) {
          <a class="cta" [href]="o.whatsappUrl" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> Falar com a loja no WhatsApp</a>
        }
        <a class="back" [routerLink]="['/pedir', slug]">Voltar ao cardápio</a>
        <p class="auto">Esta página atualiza sozinha.</p>
      }
    </div>
  `,
  styles: [`
    :host { display:block; background:var(--bg); min-height:100vh; }
    .track { max-width:520px; margin:0 auto; padding:32px 16px 60px; color:var(--text); }
    .center { display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:60vh; text-align:center; gap:8px; }
    .big { font-size:52px; width:52px; height:52px; color:var(--primary); }
    h1 { font-family:var(--font-display); font-size:28px; margin:0; letter-spacing:-.5px; }
    .when { color:var(--text-secondary); margin:4px 0 20px; }
    .pay { display:flex; flex-direction:column; align-items:center; gap:10px; text-align:center; background:var(--surface);
      border:1.5px solid var(--border); border-radius:var(--radius-lg); padding:18px 14px; margin-bottom:16px; }
    .pay h2 { font-family:var(--font-display); font-size:20px; margin:0; }
    .pay p { margin:0; color:var(--text-secondary); }
    .pay img { background:#fff; padding:8px; border-radius:var(--radius-md); max-width:100%; height:auto; }
    .pay code { font-family:var(--font-mono); font-size:12.5px; word-break:break-all; color:var(--text-secondary); }
    .pay button { border:1.5px solid var(--text); background:none; color:var(--text); border-radius:100px; padding:8px 18px; font:inherit; font-weight:700; cursor:pointer; }
    .pay small { color:var(--text-secondary); }
    .paid { display:flex; gap:8px; align-items:center; color:var(--success); font-weight:700; margin:0 0 12px; }
    .cancelled { display:flex; gap:8px; align-items:center; color:var(--danger); font-weight:700; background:var(--danger-bg);
      padding:12px 14px; border-radius:var(--radius-md); }
    .steps { list-style:none; margin:0 0 20px; padding:0; display:flex; flex-direction:column; gap:0; }
    .steps li { display:flex; align-items:center; gap:12px; padding:8px 0; position:relative; color:var(--text-tertiary); font-weight:600; }
    .steps li + li::before { content:''; position:absolute; left:13px; top:-12px; height:20px; border-left:2px solid var(--border); }
    .steps li.done { color:var(--text); }
    .steps li.done + li.done::before { border-color:var(--success); }
    .steps li.current { color:var(--success); }
    .dot { width:28px; height:28px; border-radius:50%; border:2px solid var(--border); display:grid; place-items:center; background:var(--surface); flex:none; }
    .done .dot { background:var(--success); border-color:var(--success); color:#fff; }
    .dot mat-icon { font-size:18px; width:18px; height:18px; }
    .box { background:var(--surface); border:1.5px solid var(--border); border-radius:var(--radius-lg); padding:14px; margin-bottom:16px; }
    .box ul { list-style:none; margin:0 0 8px; padding:0 0 8px; border-bottom:1px dashed var(--border); display:flex; flex-direction:column; gap:6px; }
    .box li, .row { display:flex; justify-content:space-between; gap:12px; font-size:14.5px; }
    .row { padding:3px 0; color:var(--text-secondary); }
    .row.total { color:var(--text); font-weight:800; font-size:16px; }
    .money { font-variant-numeric:tabular-nums; }
    .cta { display:flex; justify-content:center; align-items:center; gap:8px; padding:14px; border-radius:var(--radius-lg);
      background:#1f8f4e; color:#fff; font-weight:800; text-decoration:none; }
    .back { display:block; text-align:center; margin-top:14px; color:var(--primary-text); font-weight:600; }
    .auto { text-align:center; font-size:12.5px; color:var(--text-tertiary); }
  `],
})
export class OrderTrackingComponent implements OnInit, OnDestroy {
  private readonly route = inject(ActivatedRoute);
  private readonly deliveryService = inject(DeliveryService);
  private poll: Subscription | null = null;

  slug = '';
  order = signal<PlacedOrder | null>(null);
  loading = signal(true);
  copied = signal(false);
  now = signal(Date.now());
  private id = '';
  private clock: ReturnType<typeof setInterval> | null = null;

  private readonly flow: DeliveryOrderStatus[] = ['RECEIVED', 'ACCEPTED', 'DISPATCHED', 'COMPLETED'];

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    this.id = this.route.snapshot.paramMap.get('orderId') ?? '';
    this.clock = setInterval(() => this.now.set(Date.now()), 1000);
    this.watch(15000);
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
    if (this.clock) clearInterval(this.clock);
  }

  private watch(period: number): void {
    this.poll?.unsubscribe();
    this.poll = timer(0, period)
      .pipe(switchMap(() => this.deliveryService.trackOrder(this.slug, this.id)))
      .subscribe({
        next: (order) => {
          const previous = this.order();
          this.order.set(order);
          this.loading.set(false);
          if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
            this.poll?.unsubscribe();
            return;
          }
          const awaiting = order.status === 'AWAITING_PAYMENT';
          const wasAwaiting = previous?.status === 'AWAITING_PAYMENT';
          if (awaiting && period !== 4000) this.watch(4000);
          if (!awaiting && wasAwaiting) this.watch(15000);
        },
        error: () => this.loading.set(false),
      });
  }

  copy(text: string): void {
    navigator.clipboard?.writeText(text).then(
      () => this.copied.set(true),
      () => {},
    );
  }

  remaining(): string {
    const expiresAt = this.order()?.pix?.expiresAt;
    if (!expiresAt) return '';
    const seconds = Math.max(0, Math.floor((new Date(expiresAt).getTime() - this.now()) / 1000));
    if (seconds === 0) return 'O código venceu. Aguarde a confirmação ou faça um novo pedido.';
    const minutes = Math.floor(seconds / 60);
    const rest = String(seconds % 60).padStart(2, '0');
    return `O código vence em ${minutes}:${rest}.`;
  }

  steps(fulfillment: string): Step[] {
    return [
      { status: 'RECEIVED', label: 'Pedido enviado' },
      { status: 'ACCEPTED', label: 'Loja aceitou e está separando' },
      { status: 'DISPATCHED', label: fulfillment === 'DELIVERY' ? 'Saiu para entrega' : 'Pronto para retirar' },
      { status: 'COMPLETED', label: fulfillment === 'DELIVERY' ? 'Entregue' : 'Retirado' },
    ];
  }

  reached(status: DeliveryOrderStatus, index: number): boolean {
    return this.flow.indexOf(status) >= index;
  }

  current(status: DeliveryOrderStatus, index: number): boolean {
    return this.flow.indexOf(status) === index && status !== 'COMPLETED';
  }

  money(value: number): string {
    return brl(value);
  }

  payment(order: PlacedOrder): string {
    return PAYMENT_LABELS[order.paymentMethod];
  }
}
