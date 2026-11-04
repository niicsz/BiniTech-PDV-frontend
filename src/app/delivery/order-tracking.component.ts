import { Component, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Subscription, interval, startWith, switchMap } from 'rxjs';
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

        @if (o.status === 'CANCELLED') {
          <p class="cancelled"><mat-icon>cancel</mat-icon> Este pedido foi cancelado pela loja.</p>
        } @else {
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

        <a class="cta" [href]="o.whatsappUrl" target="_blank" rel="noopener"><mat-icon>chat</mat-icon> Falar com a loja no WhatsApp</a>
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

  private readonly flow: DeliveryOrderStatus[] = ['RECEIVED', 'ACCEPTED', 'DISPATCHED', 'COMPLETED'];

  ngOnInit(): void {
    this.slug = this.route.snapshot.paramMap.get('slug') ?? '';
    const id = this.route.snapshot.paramMap.get('orderId') ?? '';
    this.poll = interval(15000)
      .pipe(
        startWith(0),
        switchMap(() => this.deliveryService.trackOrder(this.slug, id)),
      )
      .subscribe({
        next: (order) => {
          this.order.set(order);
          this.loading.set(false);
          if (order.status === 'COMPLETED' || order.status === 'CANCELLED') this.poll?.unsubscribe();
        },
        error: () => this.loading.set(false),
      });
  }

  ngOnDestroy(): void {
    this.poll?.unsubscribe();
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
