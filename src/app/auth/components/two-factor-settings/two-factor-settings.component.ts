import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { toDataURL } from 'qrcode';
import { AuthService } from '../../services/auth.service';
import { AnalyticsService } from '../../../core/analytics.service';
import { TwoFactorSetup } from '../../../shared/models/api.models';
import { lockMessage, twoFactorFeedback } from '../../two-factor-errors';

type Mode = 'loading' | 'disabled' | 'setup' | 'enabled' | 'unavailable';

@Component({
  selector: 'app-two-factor-settings',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="tf-container">
      <mat-card class="tf-card" appearance="outlined">
        <mat-card-header class="tf-header">
          <mat-icon class="logo-icon">{{ mode === 'enabled' ? 'verified_user' : 'shield' }}</mat-icon>
          <mat-card-title>Verificação em duas etapas</mat-card-title>
          <mat-card-subtitle>Proteja sua conta com um código do aplicativo autenticador</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          @if (lockedUntil) {
            <div class="lock-banner" role="alert">
              <mat-icon>lock_clock</mat-icon>
              <div>
                <strong>Verificação bloqueada</strong>
                <span>{{ lockText }}</span>
              </div>
            </div>
          }

          @if (successMessage) {
            <div class="success-message"><mat-icon>check_circle</mat-icon>{{ successMessage }}</div>
          }

          @switch (mode) {
            @case ('loading') {
              <div class="center"><mat-spinner diameter="36"></mat-spinner></div>
            }

            @case ('unavailable') {
              <div class="error-message"><mat-icon>error</mat-icon>{{ errorMessage }}</div>
              <div class="tf-actions">
                <button mat-stroked-button type="button" (click)="loadStatus()">
                  <mat-icon>refresh</mat-icon> Tentar novamente
                </button>
              </div>
            }

            @case ('disabled') {
              <div class="status-pill off"><mat-icon>gpp_maybe</mat-icon> Desativada</div>
              <p class="text">
                Ao ativar, além da senha será pedido um código de 6 dígitos gerado no seu celular sempre que você entrar.
                Após 3 códigos errados seguidos, o acesso fica bloqueado por 1 hora.
              </p>
              @if (errorMessage) {
                <div class="error-message"><mat-icon>error</mat-icon>{{ errorMessage }}</div>
              }
              <div class="tf-actions">
                <button mat-flat-button color="primary" type="button" (click)="startSetup()" [disabled]="busy" class="tf-btn">
                  <mat-spinner *ngIf="busy" diameter="20"></mat-spinner>
                  <mat-icon *ngIf="!busy">add_moderator</mat-icon>
                  Ativar verificação em duas etapas
                </button>
              </div>
            }

            @case ('setup') {
              <ol class="steps">
                <li>
                  @if (setup?.algorithm === 'SHA1') {
                    <span>Escaneie o QR code com um aplicativo autenticador, como Google Authenticator,
                      Microsoft Authenticator ou Aegis.</span>
                  } @else {
                    <span>Escaneie o QR code com um aplicativo autenticador compatível com {{ setup?.algorithm }}
                      (por exemplo Aegis, 2FAS ou 1Password).</span>
                  }
                  @if (qrCode) {
                    <img [src]="qrCode" alt="QR code para o aplicativo autenticador" class="qr" width="208" height="208" />
                  }
                  <span class="hint">Não consegue escanear? Digite a chave manualmente:</span>
                  <div class="manual-key-row">
                    <code class="manual-key" [class.masked]="!keyVisible" [attr.aria-hidden]="!keyVisible">{{ manualKey }}</code>
                    <button mat-icon-button type="button" (click)="keyVisible = !keyVisible"
                            [attr.aria-label]="keyVisible ? 'Ocultar chave' : 'Mostrar chave'"
                            [attr.aria-pressed]="keyVisible">
                      <mat-icon>{{ keyVisible ? 'visibility_off' : 'visibility' }}</mat-icon>
                    </button>
                  </div>
                  <span class="hint">Tipo: baseado em tempo · Algoritmo: {{ setup?.algorithm }} · {{ setup?.digits }} dígitos · {{ setup?.period }} segundos</span>
                </li>
                <li>
                  <span>Digite o código que aparece no aplicativo para confirmar.</span>
                  <form (ngSubmit)="confirmEnable()" class="tf-form">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Código de verificação</mat-label>
                      <mat-icon matPrefix>pin</mat-icon>
                      <input matInput [(ngModel)]="code" name="code" inputmode="numeric" autocomplete="one-time-code"
                             maxlength="8" placeholder="000000" (input)="sanitizeCode()" class="code-input" required />
                    </mat-form-field>
                    @if (errorMessage) {
                      <div class="error-message"><mat-icon>error</mat-icon>{{ errorMessage }}</div>
                    }
                    <div class="tf-actions">
                      <button mat-stroked-button type="button" (click)="cancelSetup()">Cancelar</button>
                      <button mat-flat-button color="primary" type="submit" [disabled]="busy" class="tf-btn">
                        <mat-spinner *ngIf="busy" diameter="20"></mat-spinner>
                        Confirmar e ativar
                      </button>
                    </div>
                  </form>
                </li>
              </ol>
            }

            @case ('enabled') {
              <div class="status-pill on"><mat-icon>verified_user</mat-icon> Ativada</div>
              <p class="text">Para desativar, confirme com um código atual do seu aplicativo autenticador.</p>
              <form (ngSubmit)="confirmDisable()" class="tf-form">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Código de verificação</mat-label>
                  <mat-icon matPrefix>pin</mat-icon>
                  <input matInput [(ngModel)]="code" name="code" inputmode="numeric" autocomplete="one-time-code"
                         maxlength="8" placeholder="000000" (input)="sanitizeCode()" class="code-input"
                         [disabled]="!!lockedUntil" required />
                </mat-form-field>
                @if (errorMessage && !lockedUntil) {
                  <div class="error-message"><mat-icon>error</mat-icon>{{ errorMessage }}</div>
                }
                <div class="tf-actions">
                  <button mat-stroked-button color="warn" type="submit" [disabled]="busy || !!lockedUntil" class="tf-btn">
                    <mat-spinner *ngIf="busy" diameter="20"></mat-spinner>
                    <mat-icon *ngIf="!busy">remove_moderator</mat-icon>
                    Desativar
                  </button>
                </div>
              </form>
            }
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .tf-container { display:flex; justify-content:center; padding-top:24px; }
    .tf-card { width:100%; max-width:520px; padding:32px; }
    .tf-header { display:flex; flex-direction:column; align-items:center; text-align:center; margin-bottom:20px; }
    .logo-icon { font-size:48px; height:48px; width:48px; color:var(--primary-dark); margin-bottom:8px; }
    .center { display:flex; justify-content:center; padding:24px 0; }
    .text { color:var(--text-secondary); font-size:14px; line-height:1.55; margin:12px 0 16px; }
    .status-pill { display:inline-flex; align-items:center; gap:6px; padding:6px 12px; border-radius:999px;
      font-weight:700; font-size:13px; border:1.5px solid currentColor; }
    .status-pill mat-icon { font-size:18px; width:18px; height:18px; }
    .status-pill.on { color:var(--success); background:var(--success-bg); }
    .status-pill.off { color:var(--text-secondary); }
    .steps { margin:0; padding-left:20px; display:flex; flex-direction:column; gap:20px; font-size:14px; }
    .steps li { display:flex; flex-direction:column; gap:10px; }
    .qr { align-self:center; background:#fff; padding:8px; border-radius:var(--radius); border:1.5px solid var(--border); }
    .hint { color:var(--text-secondary); font-size:12.5px; }
    .manual-key { font-family:var(--font-mono); font-size:13px; word-break:break-all; background:var(--bg);
      border:1px dashed var(--border); border-radius:var(--radius); padding:10px 12px; user-select:all;
      flex:1; min-width:0; transition:filter .15s ease; }
    .manual-key.masked { filter:blur(6px); user-select:none; }
    .manual-key-row { display:flex; align-items:center; gap:4px; }
    .tf-form { display:flex; flex-direction:column; gap:4px; }
    .full-width { width:100%; }
    .code-input { font-family:var(--font-mono); font-size:20px; letter-spacing:6px; text-align:center; }
    .error-message { display:flex; align-items:center; gap:8px; background:var(--danger-bg); color:var(--danger);
      padding:12px 16px; border-radius:8px; font-size:13px; margin-bottom:8px; }
    .success-message { display:flex; align-items:center; gap:8px; background:var(--success-bg); color:var(--success);
      padding:12px 16px; border-radius:8px; font-size:13px; margin-bottom:16px; }
    .lock-banner { display:flex; align-items:flex-start; gap:12px; background:var(--danger-bg); color:var(--danger);
      border:2px solid var(--danger); border-radius:var(--radius); padding:14px 16px; margin-bottom:16px; font-size:13.5px; line-height:1.45; }
    .lock-banner mat-icon { flex-shrink:0; }
    .lock-banner div { display:flex; flex-direction:column; gap:2px; }
    .tf-actions { display:flex; gap:12px; justify-content:flex-end; flex-wrap:wrap; margin-top:8px; }
    .tf-btn { display:flex; align-items:center; gap:8px; }
    @media (max-width:600px) { .tf-card { padding:20px; } }
  `]
})
export class TwoFactorSettingsComponent implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private analytics = inject(AnalyticsService);

  mode: Mode = 'loading';
  setup: TwoFactorSetup | null = null;
  qrCode = '';
  manualKey = '';
  keyVisible = false;
  code = '';
  busy = false;
  errorMessage = '';
  successMessage = '';
  lockedUntil: Date | null = null;
  private lockTimer?: ReturnType<typeof setTimeout>;

  get lockText(): string {
    return this.lockedUntil ? lockMessage(this.lockedUntil) : '';
  }

  ngOnInit(): void {
    this.loadStatus();
  }

  ngOnDestroy(): void {
    clearTimeout(this.lockTimer);
  }

  loadStatus(): void {
    this.mode = 'loading';
    this.errorMessage = '';
    this.authService.twoFactorStatus().subscribe({
      next: status => {
        this.mode = status.enabled ? 'enabled' : 'disabled';
        this.setLock(status.lockedUntil ? new Date(status.lockedUntil) : null);
      },
      error: err => {
        this.mode = 'unavailable';
        this.errorMessage = err?.error?.message || 'Não foi possível consultar a verificação em duas etapas.';
      }
    });
  }

  startSetup(): void {
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.setupTwoFactor().subscribe({
      next: async setup => {
        this.setup = setup;
        this.manualKey = this.base32Key(setup.otpauthUri);
        this.code = '';
        try {
          this.qrCode = await toDataURL(setup.otpauthUri, { margin: 1, width: 208, errorCorrectionLevel: 'M' });
        } catch {
          this.qrCode = '';
        }
        this.busy = false;
        this.mode = 'setup';
      },
      error: err => {
        this.busy = false;
        this.errorMessage = twoFactorFeedback(err, 'Não foi possível iniciar a ativação.').message;
        if (err?.status === 409) {
          this.loadStatus();
        }
      }
    });
  }

  confirmEnable(): void {
    if (!this.validCode()) {
      return;
    }
    this.busy = true;
    this.errorMessage = '';
    this.authService.enableTwoFactor(this.code).subscribe({
      next: () => {
        this.busy = false;
        this.clearSetup();
        this.mode = 'enabled';
        this.successMessage = 'Verificação em duas etapas ativada. Ela será pedida no próximo login.';
        this.analytics.track('two_factor_enabled');
      },
      error: err => {
        this.busy = false;
        this.code = '';
        this.errorMessage = twoFactorFeedback(err, 'Código de verificação inválido.').message;
      }
    });
  }

  cancelSetup(): void {
    this.clearSetup();
    this.errorMessage = '';
    this.mode = 'disabled';
  }

  confirmDisable(): void {
    if (this.lockedUntil || !this.validCode()) {
      return;
    }
    this.busy = true;
    this.errorMessage = '';
    this.successMessage = '';
    this.authService.disableTwoFactor(this.code).subscribe({
      next: () => {
        this.busy = false;
        this.code = '';
        this.mode = 'disabled';
        this.successMessage = 'Verificação em duas etapas desativada.';
        this.analytics.track('two_factor_disabled');
      },
      error: err => {
        this.busy = false;
        this.code = '';
        const feedback = twoFactorFeedback(err, 'Código de verificação inválido.');
        this.errorMessage = feedback.message;
        this.setLock(feedback.lockedUntil);
      }
    });
  }

  sanitizeCode(): void {
    this.code = this.code.replace(/\D/g, '');
  }

  private validCode(): boolean {
    if (!/^\d{6,8}$/.test(this.code)) {
      this.errorMessage = 'Informe o código de 6 dígitos do aplicativo autenticador.';
      return false;
    }
    return true;
  }

  private setLock(lockedUntil: Date | null): void {
    clearTimeout(this.lockTimer);
    this.lockedUntil = lockedUntil && lockedUntil.getTime() > Date.now() ? lockedUntil : null;
    if (this.lockedUntil) {
      const wait = Math.min(this.lockedUntil.getTime() - Date.now(), 2_147_000_000);
      this.lockTimer = setTimeout(() => {
        this.lockedUntil = null;
        this.errorMessage = '';
      }, wait);
    }
  }

  private clearSetup(): void {
    this.setup = null;
    this.qrCode = '';
    this.manualKey = '';
    this.keyVisible = false;
    this.code = '';
  }

  private base32Key(uri: string): string {
    try {
      const secret = new URL(uri).searchParams.get('secret') ?? '';
      return secret.replace(/(.{4})/g, '$1 ').trim();
    } catch {
      return '';
    }
  }
}
