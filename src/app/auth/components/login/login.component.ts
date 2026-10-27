import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatFormFieldModule, MatInputModule,
    MatButtonModule, MatIconModule
  ],
  template: `
    <div class="login-shell">
      <aside class="brand-side" aria-hidden="true">
        <a class="brand" routerLink="/" tabindex="-1">
          <svg width="28" height="28" viewBox="0 0 24 24">
            <rect width="24" height="24" rx="6" fill="#f4f3f1" />
            <rect x="6" y="6" width="12" height="4" rx="1" fill="#141414" />
            <path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2" stroke="#141414" stroke-width="1.6" stroke-linecap="round" />
          </svg>
          <span>BiniTech PDV</span>
        </a>
        <div class="brand-statement">
          <p class="statement">O caixa abre aqui.</p>
          <p class="brand-sub">Frente de caixa, estoque, fiado e o relatório do dia, no navegador da loja.</p>
        </div>
        <p class="brand-name">BiniTech PDV</p>
      </aside>

      <main class="form-side">
        <div class="form-wrap">
          <a class="brand brand-mobile" routerLink="/">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <rect x="6" y="6" width="12" height="4" rx="1" fill="var(--bg)" />
              <path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2" stroke="var(--bg)" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span>BiniTech PDV</span>
          </a>

          <h1>Entrar</h1>
          <p class="form-sub">Use o usuário e a senha que o administrador da loja criou para você.</p>

          <form (ngSubmit)="onLogin()" class="login-form">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Usuário</mat-label>
              <input matInput [(ngModel)]="username" name="username" autocomplete="username" required autofocus />
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Senha</mat-label>
              <input matInput [type]="hidePassword ? 'password' : 'text'" [(ngModel)]="password"
                     name="password" autocomplete="current-password" required />
              <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword"
                      [attr.aria-label]="hidePassword ? 'Mostrar senha' : 'Ocultar senha'">
                <mat-icon>{{ hidePassword ? 'visibility' : 'visibility_off' }}</mat-icon>
              </button>
            </mat-form-field>

            <div class="row-forgot">
              <a routerLink="/forgot-password">Esqueci minha senha</a>
            </div>

            <div *ngIf="errorMessage" class="error-message" role="alert">
              <mat-icon aria-hidden="true">error</mat-icon>{{ errorMessage }}
            </div>

            <button mat-flat-button color="primary" type="submit" [disabled]="loading" class="login-btn">
              {{ loading ? 'Entrando…' : 'Entrar' }}
            </button>
          </form>

          <p class="signup-hint">
            Ainda não usa o BiniTech PDV?
            <a routerLink="/signup">Cadastre sua loja</a>
          </p>
        </div>
      </main>
    </div>
  `,
  styles: [`
    :host { display: block; }
    .login-shell { min-height: 100vh; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); background: var(--bg); }

    .brand-side { display: flex; flex-direction: column; justify-content: space-between; gap: 40px;
      padding: 40px 48px 32px; background: #141414; color: #d4d4d1; overflow: hidden; }
    .brand { display: inline-flex; align-items: center; gap: 10px; font-weight: 600; font-size: 16px; color: inherit; }
    .brand:hover { text-decoration: none; }
    .brand-side .brand { color: #f4f3f1; }
    .statement { font-size: clamp(36px, 4vw, 56px); line-height: 1; letter-spacing: -0.04em; font-weight: 600; color: #ffffff; }
    .brand-sub { margin-top: 20px; max-width: 420px; font-size: 17px; line-height: 26px; }
    .brand-name { font-size: clamp(56px, 7.6vw, 112px); line-height: .85; letter-spacing: -0.05em; font-weight: 600; color: #262626; white-space: nowrap; }

    .form-side { display: flex; align-items: center; justify-content: center; padding: 40px 24px; }
    .form-wrap { width: 100%; max-width: 380px; }
    .brand-mobile { display: none; margin-bottom: 32px; color: var(--text); }
    .brand-mobile svg { color: var(--primary); }
    h1 { font-size: 28px; line-height: 34px; letter-spacing: -0.02em; font-weight: 600; }
    .form-sub { margin: 8px 0 24px; color: var(--text-secondary); }
    .login-form { display: flex; flex-direction: column; gap: 4px; }
    .full-width { width: 100%; }
    .row-forgot { display: flex; justify-content: flex-end; margin: -4px 0 12px; }
    .row-forgot a { font-weight: 500; }
    .error-message { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; padding: 10px 12px;
      border-radius: var(--radius); background: var(--danger-bg); color: var(--danger-ink); }
    .error-message mat-icon { flex: none; font-size: 18px; width: 18px; height: 18px; }
    .login-btn { width: 100%; height: 48px; font-size: 15px; }
    .signup-hint { margin-top: 24px; padding-top: 20px; border-top: 1px solid var(--border); color: var(--text-secondary); }
    .signup-hint a { font-weight: 500; color: var(--text); }

    @media (max-width: 900px) {
      .login-shell { grid-template-columns: 1fr; }
      .brand-side { display: none; }
      .brand-mobile { display: inline-flex; }
      .form-side { align-items: flex-start; padding-top: 48px; }
    }
  `]
})
export class LoginComponent {
  username = '';
  password = '';
  errorMessage = '';
  loading = false;
  hidePassword = true;
  year = new Date().getFullYear();

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  onLogin(): void {
    if (!this.username || !this.password) {
      this.errorMessage = 'Preencha usuário e senha.';
      return;
    }
    this.loading = true;
    this.errorMessage = '';

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading = false;
        const target = this.authService.isSuperAdmin() ? '/admin' : '/pdv';
        this.router.navigate([target]);
      },
      error: (err) => {
        this.loading = false;
        this.errorMessage = err?.error?.message || 'Erro ao fazer login. Verifique suas credenciais.';
      }
    });
  }
}
