import { Component, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { toDataURL } from 'qrcode';
import { PixCharge, PixService } from '../../../pix/pix.service';

const POLL_MS = 2500;

@Component({
  selector: 'app-pix-charge-modal',
  imports: [CommonModule, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="pix-title">
      <mat-card class="modal-content" appearance="outlined">
        <div class="modal-header">
          <mat-icon class="pix-icon">pix</mat-icon>
          <h3 id="pix-title">Pagamento por Pix</h3>
        </div>

        <div class="amount">
          <span>Valor</span>
          <strong>R$ {{ charge.amount | number: '1.2-2' }}</strong>
        </div>

        <ng-container *ngIf="charge.status === 'PENDING' || charge.status === 'PROCESSING'">
          <div class="qr-box">
            <img *ngIf="qrImage" [src]="qrImage" alt="QR Code do Pix" width="240" height="240" />
            <div *ngIf="!qrImage" class="qr-placeholder">Gerando QR…</div>
          </div>
          <p class="waiting" role="status" aria-live="polite">
            <span class="pulse" aria-hidden="true"></span>
            {{ charge.status === 'PROCESSING' ? 'Pagamento recebido, registrando a venda…' : 'Aguardando o pagamento' }}
            <span class="timer" *ngIf="charge.status === 'PENDING'">· vence em {{ remaining }}</span>
          </p>
          <div class="copy-row" *ngIf="charge.qrCode">
            <input id="pix-copy-code" class="code" [value]="charge.qrCode" readonly aria-label="Código Pix copia e cola" (focus)="selectCode($event)" />
            <button mat-stroked-button type="button" (click)="copy()">
              <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon> {{ copied ? 'Copiado' : 'Copiar' }}
            </button>
          </div>
          <p class="hint">O cliente lê o QR no app do banco. A venda é registrada sozinha quando o Pix cair.</p>
          <div class="actions">
            <button mat-stroked-button type="button" (click)="cancel()" [disabled]="busy || charge.status === 'PROCESSING'">
              Cancelar Pix
            </button>
          </div>
        </ng-container>

        <ng-container *ngIf="charge.status === 'PAID' && !charge.sale">
          <div class="result error">
            <mat-icon>report</mat-icon>
            <div>
              <strong>Pix recebido, mas a venda não foi registrada.</strong>
              <span>{{ charge.failureReason }}</span>
              <span>Anote o código {{ charge.id.slice(0, 8) }} e lance a venda manualmente marcando PIX.</span>
            </div>
          </div>
          <div class="actions">
            <button mat-flat-button color="primary" type="button" (click)="closed.emit('failed')">Entendi</button>
          </div>
        </ng-container>

        <ng-container *ngIf="charge.status === 'EXPIRED' || charge.status === 'CANCELLED'">
          <div class="result">
            <mat-icon>timer_off</mat-icon>
            <div>
              <strong>{{ charge.status === 'EXPIRED' ? 'O QR venceu sem pagamento.' : 'Pix cancelado.' }}</strong>
              <span>Nenhuma venda foi registrada. Você pode gerar outro QR ou escolher outra forma de pagamento.</span>
            </div>
          </div>
          <div class="actions">
            <button mat-flat-button color="primary" type="button" (click)="closed.emit('retry')">Voltar ao pagamento</button>
          </div>
        </ng-container>

        <p class="error-text" *ngIf="error" role="alert">{{ error }}</p>
      </mat-card>
    </div>
  `,
  styles: [`
    .modal-overlay { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center;
      background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); padding: 16px; }
    .modal-content { width: 420px; max-width: 100%; max-height: 92vh; overflow-y: auto; padding: 22px; display: grid; gap: 14px; }
    .modal-header { display: flex; align-items: center; gap: 10px; }
    .modal-header h3 { margin: 0; font-size: 20px; font-weight: 700; color: var(--text); }
    .pix-icon { color: #32bcad; font-size: 28px; width: 28px; height: 28px; }
    .amount { display: flex; justify-content: space-between; align-items: center; padding: 12px 16px; border-radius: var(--radius);
      background: var(--primary); color: #fff; }
    .amount strong { font-size: 26px; font-family: var(--font-mono); }
    .qr-box { display: grid; place-items: center; padding: 12px; background: #fff; border-radius: var(--radius); border: 1px solid var(--border); }
    .qr-box img { width: 240px; height: 240px; max-width: 100%; image-rendering: pixelated; }
    .qr-placeholder { width: 240px; height: 240px; display: grid; place-items: center; color: #555; }
    .waiting { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 0; color: var(--text); font-weight: 600; flex-wrap: wrap; }
    .timer { color: var(--text-secondary); font-weight: 500; font-variant-numeric: tabular-nums; }
    .pulse { width: 10px; height: 10px; border-radius: 50%; background: #32bcad; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%, 100% { opacity: .3; } 50% { opacity: 1; } }
    @media (prefers-reduced-motion: reduce) { .pulse { animation: none; } }
    .copy-row { display: flex; gap: 8px; }
    .code { flex: 1; min-width: 0; font-family: var(--font-mono); font-size: 12px; padding: 8px 10px; border: 1px solid var(--border);
      border-radius: var(--radius); background: var(--surface-alt); color: var(--text); }
    .hint { margin: 0; color: var(--text-secondary); font-size: 13px; text-align: center; }
    .actions { display: flex; justify-content: flex-end; gap: 8px; }
    .result { display: flex; gap: 10px; padding: 12px 14px; border-radius: var(--radius); background: var(--surface-alt); border: 1px solid var(--border); }
    .result div { display: grid; gap: 4px; font-size: 13px; color: var(--text-secondary); }
    .result strong { color: var(--text); font-size: 14px; }
    .result.error { border-color: var(--danger); }
    .result.error mat-icon { color: var(--danger); }
    .error-text { margin: 0; color: var(--danger); font-size: 13px; }
  `],
})
export class PixChargeModalComponent implements OnInit, OnDestroy {
  private readonly pixService = inject(PixService);

  @Input({ required: true }) charge!: PixCharge;
  @Output() readonly paid = new EventEmitter<PixCharge>();
  @Output() readonly closed = new EventEmitter<'retry' | 'failed'>();

  qrImage = '';
  remaining = '';
  copied = false;
  busy = false;
  error = '';
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private clockTimer: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    this.prepareQr();
    this.tick();
    this.clockTimer = setInterval(() => this.tick(), 1000);
    this.schedulePoll();
  }

  ngOnDestroy(): void {
    this.stopTimers();
  }

  @HostListener('window:keydown', ['$event'])
  onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      if (this.charge.status === 'EXPIRED' || this.charge.status === 'CANCELLED') this.closed.emit('retry');
    }
  }

  selectCode(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  copy(): void {
    const code = this.charge.qrCode || '';
    navigator.clipboard
      .writeText(code)
      .then(() => {
        this.copied = true;
        setTimeout(() => (this.copied = false), 2000);
      })
      .catch(() => {
        const input = document.getElementById('pix-copy-code') as HTMLInputElement | null;
        input?.focus();
        input?.select();
      });
  }

  cancel(): void {
    if (this.busy) return;
    this.busy = true;
    this.error = '';
    this.pixService.cancelCharge(this.charge.id).subscribe({
      next: (charge) => {
        this.busy = false;
        this.apply(charge);
      },
      error: (err) => {
        this.busy = false;
        this.error = err.error?.message || 'Não foi possível cancelar. Tente de novo.';
      },
    });
  }

  private schedulePoll(): void {
    this.pollTimer = setTimeout(() => this.poll(), POLL_MS);
  }

  private poll(): void {
    if (!this.isWaiting()) return;
    this.pixService.getCharge(this.charge.id).subscribe({
      next: (charge) => {
        this.apply(charge);
        if (this.isWaiting()) this.schedulePoll();
      },
      error: () => this.schedulePoll(),
    });
  }

  private apply(charge: PixCharge): void {
    const qr = this.charge.qrCode;
    const qrBase64 = this.charge.qrCodeBase64;
    this.charge = { ...charge, qrCode: charge.qrCode ?? qr, qrCodeBase64: charge.qrCodeBase64 ?? qrBase64 };
    if (!this.isWaiting()) this.stopTimers();
    if (charge.status === 'PAID' && charge.sale) this.paid.emit(this.charge);
  }

  private isWaiting(): boolean {
    return this.charge.status === 'PENDING' || this.charge.status === 'PROCESSING';
  }

  private prepareQr(): void {
    if (this.charge.qrCodeBase64) {
      this.qrImage = 'data:image/png;base64,' + this.charge.qrCodeBase64;
      return;
    }
    if (this.charge.qrCode) {
      toDataURL(this.charge.qrCode, { margin: 1, width: 240, errorCorrectionLevel: 'M' })
        .then((url) => (this.qrImage = url))
        .catch(() => (this.qrImage = ''));
    }
  }

  private tick(): void {
    const expires = this.charge.expiresAt ? new Date(this.charge.expiresAt).getTime() : 0;
    const seconds = Math.max(0, Math.floor((expires - Date.now()) / 1000));
    const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
    const ss = String(seconds % 60).padStart(2, '0');
    this.remaining = `${mm}:${ss}`;
  }

  private stopTimers(): void {
    if (this.pollTimer) clearTimeout(this.pollTimer);
    if (this.clockTimer) clearInterval(this.clockTimer);
    this.pollTimer = null;
    this.clockTimer = null;
  }
}
