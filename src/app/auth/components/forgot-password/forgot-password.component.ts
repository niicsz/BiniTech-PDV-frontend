import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule, MatProgressSpinnerModule
  ],
  template: `
    <div class="auth-bg">
      <mat-card class="auth-card" appearance="outlined">
        <div class="brand">
          <span class="brand-logo"><svg class="mark" width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><rect width="24" height="24" rx="6" fill="currentColor" /><rect x="6" y="6" width="12" height="4" rx="1" fill="var(--surface)" /><path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2" stroke="var(--surface)" stroke-width="1.6" stroke-linecap="round" /></svg></span>
          <span class="brand-name">BiniTech <strong>PDV</strong></span>
        </div>

        @if (sent) {
          <div class="done">
            <mat-icon class="done-ico">mark_email_read</mat-icon>
            <h1>Verifique o e-mail</h1>
            <p>
              Se a conta existir, enviamos um link de redefinição para o
              <strong>e-mail de cadastro da loja</strong>. O link expira em 1 hora.
            </p>
            <a mat-flat-button color="primary" routerLink="/login">Voltar ao login</a>
          </div>
        } @else {
          <h1>Esqueci minha senha</h1>
          <p class="subtitle">Informe seu usuário. Enviaremos um link de redefinição para o e-mail da loja.</p>

          <form (ngSubmit)="onSubmit()" class="auth-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Usuário</mat-label>
              <mat-icon matPrefix>person</mat-icon>
              <input matInput [(ngModel)]="username" name="username" placeholder="Seu usuário" required autofocus />
            </mat-form-field>

            @if (errorMessage) {
              <div class="error-message"><mat-icon>error</mat-icon>{{ errorMessage }}</div>
            }

            <button mat-flat-button color="primary" type="submit" [disabled]="loading" class="submit-btn">
              <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
              {{ loading ? 'Enviando...' : 'Enviar link de redefinição' }}
            </button>

            <p class="back-hint"><a routerLink="/login">← Voltar ao login</a></p>
          </form>
        }
      </mat-card>
    </div>
  `,
  styles: [`
    .auth-bg { position:relative; min-height:100vh; display:flex; align-items:center; justify-content:center; padding:24px;
      font-family:var(--font-family); background:var(--bg);
       overflow:hidden; }
    .glow { display:none;  position:absolute; border-radius:50%;  opacity:.4; pointer-events:none; }
    .glow-1 { width:380px; height:380px; background:#d4391a; top:-120px; right:-60px; }
    .glow-2 { width:320px; height:320px; background:#1c6b46; bottom:-140px; left:-80px; opacity:.35; }
    .auth-card { position:relative; width:100%; max-width:440px; padding:38px !important;
      background:var(--surface) !important; border:1px solid var(--border) !important;
      border-radius:var(--radius-md) !important; box-shadow:none; }
    .brand { display:flex; align-items:center; gap:11px; margin-bottom:22px; }
    .brand-logo { display:inline-flex; color:var(--primary); }
    
    .brand-name {  font-size:20px; font-weight:600; letter-spacing:-.4px; color:var(--text); }
    .brand-name strong { color:var(--primary-dark); }
    h1 {  font-size:28px; font-weight:600; letter-spacing:-.8px; margin:0 0 6px; color:var(--text); }
    .subtitle { color:var(--text-secondary); font-size:14px; margin:0 0 22px; line-height:1.55; }
    .auth-form { display:flex; flex-direction:column; gap:6px; }
    .full-width { width:100%; }
    .error-message { display:flex; align-items:center; gap:8px; background:var(--danger-bg); color:var(--danger);
      padding:12px 16px; border-radius:var(--radius); border:1px solid var(--danger); font-size:13px; margin-bottom:8px; }
    .submit-btn { width:100%; height:48px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; border-radius:var(--radius) !important; }
    .back-hint { text-align:center; margin:16px 0 0; font-size:13px; }
    .back-hint a { color:var(--primary-dark); font-weight:700; text-decoration:none; }
    .back-hint a:hover { text-decoration:underline; }
    .done { text-align:center; padding:8px 0; }
    .done-ico { font-size:56px; height:56px; width:56px; color:var(--success); margin-bottom:8px; }
    .done h1 { margin-bottom:12px; }
    .done p { color:var(--text-secondary); line-height:1.6; margin:0 0 24px; }
  `]
})
export class ForgotPasswordComponent {
  username = '';
  loading = false;
  sent = false;
  errorMessage = '';

  constructor(private authService: AuthService) {}

  onSubmit(): void {
    this.errorMessage = '';
    if (!this.username) {
      this.errorMessage = 'Informe o usuário.';
      return;
    }
    this.loading = true;
    this.authService.forgotPassword(this.username.trim()).subscribe({
      next: () => {
        this.loading = false;
        this.sent = true;
      },
      error: () => {
        this.loading = false;
        this.sent = true;
      }
    });
  }
}
