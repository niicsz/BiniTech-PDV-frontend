import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { PixService, PixSettings } from './pix.service';
import { PixFeatureService } from './pix-feature.service';

@Component({
  selector: 'app-pix-settings',
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCardModule, MatFormFieldModule, MatIconModule, MatInputModule, MatSlideToggleModule],
  template: `
    <div class="page">
      <header class="page-header">
        <mat-icon class="page-icon">pix</mat-icon>
        <div>
          <h1>Pix integrado</h1>
          <p>O caixa mostra um QR com o valor exato e registra a venda sozinho quando o cliente paga. O dinheiro cai direto na sua conta do Mercado Pago.</p>
        </div>
      </header>

      <p class="unavailable" *ngIf="loaded && !feature.featureAvailable()">
        O Pix integrado ainda não está disponível para a sua loja.
        <a routerLink="/pdv">Voltar ao caixa</a>
      </p>

      <mat-card appearance="outlined" class="card" *ngIf="feature.featureAvailable() && settings">
        <div class="status" [class.on]="settings.enabled && settings.configured">
          <mat-icon>{{ settings.enabled && settings.configured ? 'check_circle' : 'radio_button_unchecked' }}</mat-icon>
          <div>
            <strong>{{ settings.enabled && settings.configured ? 'Ligado' : 'Desligado' }}</strong>
            <span *ngIf="settings.configured">Conta: {{ settings.accountName || 'Mercado Pago' }} · token {{ settings.accessTokenHint }}</span>
            <span *ngIf="!settings.configured">Nenhuma conta do Mercado Pago conectada.</span>
          </div>
        </div>

        <form (ngSubmit)="save()" class="form">
          <mat-slide-toggle id="pix-enabled" name="enabled" [(ngModel)]="enabled">
            Usar Pix integrado no caixa
          </mat-slide-toggle>

          <mat-form-field appearance="outline">
            <mat-label>{{ settings.configured ? 'Trocar o Access Token' : 'Access Token de produção' }}</mat-label>
            <input matInput id="pix-token" name="accessToken" type="password" autocomplete="off"
                   maxlength="500" [(ngModel)]="accessToken" placeholder="APP_USR-…" />
            <mat-hint>{{ settings.configured ? 'Deixe em branco para manter o token atual.' : 'Começa com APP_USR-.' }}</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Assinatura secreta das notificações (opcional)</mat-label>
            <input matInput id="pix-secret" name="webhookSecret" type="password" autocomplete="off"
                   maxlength="500" [(ngModel)]="webhookSecret" />
            <mat-hint>{{ settings.webhookSecretConfigured ? 'Já cadastrada. Deixe em branco para manter.' : 'Aumenta a segurança, mas o Pix funciona sem ela.' }}</mat-hint>
          </mat-form-field>

          <p class="error" *ngIf="error" role="alert">{{ error }}</p>
          <p class="ok" *ngIf="message" role="status">{{ message }}</p>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving">
              <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
              {{ saving ? 'Conferindo com o Mercado Pago…' : 'Salvar' }}
            </button>
          </div>
        </form>
      </mat-card>

      <mat-card appearance="outlined" class="card help" *ngIf="feature.featureAvailable()">
        <h2>Como pegar o Access Token</h2>
        <ol>
          <li>Entre em <strong>mercadopago.com.br/developers</strong> com a conta da loja.</li>
          <li>Abra <strong>Suas integrações</strong> e crie uma aplicação (ex.: "Caixa BiniTech").</li>
          <li>Em <strong>Credenciais de produção</strong>, copie o <strong>Access Token</strong> e cole aqui.</li>
          <li>A conta precisa ter uma <strong>chave Pix cadastrada</strong> para gerar o QR.</li>
        </ol>
        <p class="muted">O token fica guardado criptografado e nunca aparece de novo na tela. Se ele vazar, gere outro no Mercado Pago e troque aqui.</p>
      </mat-card>
    </div>
  `,
  styles: [`
    .page { padding: 24px; max-width: 760px; margin: 0 auto; display: grid; gap: 16px; }
    .page-header { display: flex; gap: 14px; align-items: flex-start; }
    .page-icon { color: var(--primary); font-size: 32px; width: 32px; height: 32px; }
    h1 { margin: 0; font-size: 24px; color: var(--text); }
    .page-header p { margin: 4px 0 0; color: var(--text-secondary); max-width: 60ch; }
    .card { padding: 20px; display: grid; gap: 16px; }
    .status { display: flex; gap: 10px; align-items: center; padding: 12px 14px; border-radius: var(--radius);
      background: var(--surface-alt); border: 1px solid var(--border); color: var(--text-secondary); }
    .status div { display: grid; gap: 2px; }
    .status strong { color: var(--text); }
    .status.on { border-color: var(--success); }
    .status.on mat-icon { color: var(--success); }
    .form { display: grid; gap: 14px; }
    .actions { display: flex; justify-content: flex-end; }
    .error { color: var(--danger); margin: 0; }
    .ok { color: var(--success); margin: 0; }
    .unavailable { color: var(--text-secondary); }
    .help h2 { margin: 0; font-size: 16px; }
    .help ol { margin: 0; padding-left: 20px; display: grid; gap: 6px; color: var(--text); }
    .muted { margin: 0; color: var(--text-secondary); font-size: 13px; }
    @media (max-width: 600px) { .page { padding: 16px; } }
  `],
})
export class PixSettingsComponent implements OnInit {
  readonly feature = inject(PixFeatureService);
  private readonly pixService = inject(PixService);

  settings: PixSettings | null = null;
  loaded = false;
  enabled = false;
  accessToken = '';
  webhookSecret = '';
  saving = false;
  error = '';
  message = '';

  ngOnInit(): void {
    this.feature.ensureLoaded(true).subscribe(() => {
      this.loaded = true;
      this.apply(this.feature.settings());
    });
  }

  save(): void {
    if (this.saving) return;
    this.saving = true;
    this.error = '';
    this.message = '';
    this.pixService
      .updateSettings({
        enabled: this.enabled,
        accessToken: this.accessToken.trim() || undefined,
        webhookSecret: this.webhookSecret.trim() || undefined,
      })
      .subscribe({
        next: (settings) => {
          this.saving = false;
          this.feature.update(settings);
          this.apply(settings);
          this.message = settings.enabled ? 'Pix integrado ligado. Já dá para usar no caixa.' : 'Configuração salva.';
        },
        error: (err) => {
          this.saving = false;
          this.error = err.error?.message || 'Não foi possível salvar. Tente de novo.';
        },
      });
  }

  private apply(settings: PixSettings | null): void {
    this.settings = settings;
    this.enabled = !!settings?.enabled;
    this.accessToken = '';
    this.webhookSecret = '';
  }
}
