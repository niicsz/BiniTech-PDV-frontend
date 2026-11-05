import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AnalyticsService } from './core/analytics.service';
import { TERMS_VERSION } from './core/legal';
import { AuthService } from './auth/services/auth.service';
import { TenantPublicService } from './tenant-public.service';

@Component({
  selector: 'app-signup',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatIconModule
  ],
  template: `
    <div class="signup-page">
      <mat-card class="signup-card" appearance="outlined">
        <a class="brand" routerLink="/">
          <span class="brand-mark"><mat-icon>point_of_sale</mat-icon></span>
          <span class="brand-name">BiniTech<em>PDV</em></span>
        </a>
        <span class="kicker">[ abra seu caixa ]</span>
        <h1>Crie a conta da sua empresa</h1>
        <p class="subtitle">Comece agora. Após o cadastro, sua conta passará por uma rápida aprovação.</p>

        <form [formGroup]="form" (ngSubmit)="onSubmit()">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Nome da empresa</mat-label>
            <input maxlength="120" matInput formControlName="name" placeholder="Ex.: Mercado do João" />
            <mat-error *ngIf="form.get('name')?.hasError('required')">Informe o nome da empresa.</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Seu e-mail</mat-label>
            <input maxlength="254" matInput formControlName="billingEmail" type="email" autocomplete="email" placeholder="voce@email.com" />
            <mat-hint>Você entra no sistema com ele.</mat-hint>
            <mat-error *ngIf="form.get('billingEmail')?.hasError('required')">Informe o e-mail.</mat-error>
            <mat-error *ngIf="form.get('billingEmail')?.hasError('email')">E-mail inválido.</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Crie uma senha</mat-label>
            <input maxlength="128" matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" autocomplete="new-password" />
            <button mat-icon-button matSuffix type="button" (click)="hidePassword = !hidePassword" [attr.aria-label]="hidePassword ? 'Mostrar senha' : 'Esconder senha'">
              <mat-icon>{{ hidePassword ? 'visibility_off' : 'visibility' }}</mat-icon>
            </button>
            <mat-error *ngIf="form.get('password')?.hasError('required')">Crie uma senha.</mat-error>
            <mat-error *ngIf="form.get('password')?.hasError('minlength')">Use pelo menos 8 caracteres.</mat-error>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>WhatsApp da loja</mat-label>
            <input maxlength="20" matInput formControlName="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="(11) 91234-5678" />
            <mat-hint>Para te ajudar durante o teste. Não enviamos spam.</mat-hint>
            <mat-error *ngIf="form.get('phone')?.invalid">Informe o WhatsApp com DDD.</mat-error>
          </mat-form-field>

          <div class="hp" aria-hidden="true">
            <label>Site <input formControlName="website" tabindex="-1" autocomplete="off" /></label>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Plano</mat-label>
            <mat-select formControlName="planId">
              <mat-option value="starter">Starter — R$ 99/mês · 1 operador · 3.000 produtos</mat-option>
              <mat-option value="pro">Pro — R$ 149/mês · 3 operadores · 10.000 produtos</mat-option>
              <mat-option value="enterprise">Enterprise — R$ 349/mês · 10 operadores · produtos ilimitados</mat-option>
            </mat-select>
            <mat-hint>7 dias grátis, sem cartão. Vendas ilimitadas em todos. Dá para mudar de plano depois.</mat-hint>
          </mat-form-field>

          <mat-checkbox formControlName="acceptTerms" class="accept-terms">
            Li e aceito os <a routerLink="/termos" target="_blank">Termos de uso</a> e estou ciente da
            <a routerLink="/privacidade" target="_blank">Política de privacidade</a>.
          </mat-checkbox>
          <mat-error *ngIf="form.get('acceptTerms')?.touched && form.get('acceptTerms')?.invalid" class="accept-error">
            Aceite os Termos de uso para continuar.
          </mat-error>

          <div *ngIf="errorMessage" class="error-message">
            <mat-icon>error</mat-icon>{{ errorMessage }}
          </div>

          <button mat-flat-button color="primary" type="submit" [disabled]="loading" class="submit-btn">
            <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
            {{ loading ? 'Criando sua conta...' : 'Começar meu teste grátis' }}
          </button>
        </form>

        <p class="login-hint">Já tem uma conta? <a routerLink="/login">Entrar</a></p>
      </mat-card>
    </div>
  `,
  styles: [`
    .hp { position:absolute; left:-10000px; width:1px; height:1px; overflow:hidden; }
    .signup-page { display:flex; justify-content:center; align-items:center; min-height:100vh;
      background:var(--bg); padding:24px;
      background-image:
        radial-gradient(circle at 12% 8%, rgba(212,57,26,0.06), transparent 36%),
        radial-gradient(circle at 90% 100%, rgba(28,107,70,0.05), transparent 34%); }
    .signup-card { width:100%; max-width:460px; padding:36px 34px !important;
      background:var(--surface) !important; border:2px solid var(--text) !important;
      border-radius:var(--radius-md) !important; box-shadow:10px 10px 0 var(--shadow-hard-color) !important; }
    .brand { display:inline-flex; align-items:center; gap:11px; margin-bottom:24px; color:var(--text); }
    .brand-mark { display:grid; place-items:center; width:38px; height:38px; border-radius:var(--radius);
      background:var(--primary); border:2px solid var(--text); box-shadow:3px 3px 0 var(--shadow-hard-color); }
    .brand-mark mat-icon { color:#fff; font-size:21px; width:21px; height:21px; }
    .brand-name { font-family:var(--font-display); font-weight:800; font-size:21px; letter-spacing:-.4px; }
    .brand-name em { font-style:normal; color:var(--primary-text); }
    .kicker { font-family:var(--font-mono); font-size:12px; font-weight:600; letter-spacing:1px;
      text-transform:uppercase; color:var(--primary-text); }
    h1 { font-family:var(--font-display); font-size:30px; font-weight:800; letter-spacing:-1px;
      margin:8px 0 6px; color:var(--text); line-height:1.05; }
    .subtitle { color:var(--text-secondary); font-size:14.5px; line-height:1.55; margin:0 0 26px; }
    form { display:flex; flex-direction:column; gap:4px; }
    .full-width { width:100%; }
    .submit-btn { width:100%; height:50px; margin-top:6px; font-weight:700; font-size:15px;
      display:flex; align-items:center; justify-content:center; gap:8px; }
    .error-message { display:flex; align-items:center; gap:8px; background:var(--danger-bg);
      color:var(--danger); padding:11px 14px; border-radius:var(--radius); border:1.5px solid var(--danger);
      font-size:13px; margin-bottom:10px; }
    .accept-terms { margin:2px 0 6px; font-size:13.5px; line-height:1.45; color:var(--text-secondary); }
    .accept-terms a { color:var(--primary-text); font-weight:600; }
    .accept-error { font-size:12.5px; margin:-4px 0 8px; }
    .login-hint { text-align:center; font-size:13.5px; color:var(--text-secondary); margin-top:18px; }
    .login-hint a { color:var(--primary-text); font-weight:700; text-decoration:none; }
    .login-hint a:hover { text-decoration:underline; }
  `]
})
export class SignupComponent {
  private fb = inject(FormBuilder);
  private tenantService = inject(TenantPublicService);
  private router = inject(Router);
  private analytics = inject(AnalyticsService);

  private authService = inject(AuthService);

  loading = false;
  errorMessage = '';
  hidePassword = true;

  form = this.fb.group({
    name: ['', Validators.required],
    billingEmail: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    phone: ['', [Validators.required, Validators.pattern(/^[0-9 ()+-]{10,20}$/)]],
    website: [''],
    planId: ['pro', Validators.required],
    acceptTerms: [false, Validators.requiredTrue]
  });

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      const field = Object.keys(this.form.controls).find(key => this.form.get(key)?.invalid) ?? 'unknown';
      this.analytics.track('signup_form_error', { field });
      return;
    }
    this.loading = true;
    this.errorMessage = '';
    const { name, billingEmail, password, phone, website, planId } = this.form.getRawValue();
    this.tenantService
      .signUp({
        name: name!,
        billingEmail: billingEmail!.trim(),
        password: password!,
        phone: phone!,
        website: website || '',
        planId: planId!,
        acceptedTerms: true,
        termsVersion: TERMS_VERSION
      })
      .subscribe({
        next: (result) => {
          this.analytics.track('sign_up', { method: 'form', plan: planId! });
          if (!result.active || !result.username) {
            this.router.navigate(['/signup/success']);
            return;
          }
          this.authService.login(result.username, password!).subscribe({
            next: () => this.router.navigate(['/pdv'], { queryParams: { bemvindo: 1 } }),
            error: () => this.router.navigate(['/login']),
          });
        },
        error: (err: HttpErrorResponse) => {
          this.loading = false;
          this.analytics.track('signup_form_error', { field: 'api', status: err?.status ?? 0 });
          this.errorMessage = err?.error?.message || 'Não foi possível concluir o cadastro. Tente novamente.';
        }
      });
  }
}
