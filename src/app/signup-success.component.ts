import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-signup-success',
  standalone: true,
  imports: [RouterLink, MatButtonModule, MatIconModule],
  template: `
    <div class="success-page">
      <div class="success-card">
        <div class="stamp"><mat-icon class="check">check_circle</mat-icon></div>
        <h1>Cadastro recebido!</h1>
        <p>
          Sua empresa foi cadastrada e está <strong>aguardando aprovação</strong>.
          Assim que for aprovada, você receberá um e-mail com as credenciais de acesso.
        </p>
        <a class="btn-cta" routerLink="/login">Ir para o login <mat-icon>arrow_forward</mat-icon></a>
      </div>
    </div>
  `,
  styles: [`
    .success-page { display:flex; justify-content:center; align-items:center; min-height:100vh;
      background:var(--bg); padding:24px;
       }
    .success-card { background:var(--surface); border:1px solid var(--border); border-radius:var(--radius-md);
      padding:48px 40px; max-width:480px; text-align:center; box-shadow:none; }
    .stamp { display:grid; place-items:center; width:78px; height:78px; margin:0 auto 18px;
      border-radius:50%; background:var(--success); border:3px solid var(--text); box-shadow:none;
      transform:rotate(-4deg); }
    .check { font-size:44px; height:44px; width:44px; color:#fff; }
    .kicker { font-family:var(--font-mono); font-size:12px; font-weight:600; letter-spacing:0;
      text-transform:none; color:var(--success); }
    h1 {  font-size:30px; font-weight:600; letter-spacing:-1px;
      margin:8px 0 14px; color:var(--text); }
    p { color:var(--text-secondary); line-height:1.65; font-size:15px; margin:0 0 28px; }
    p strong { color:var(--text); }
    .btn-cta { display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:15px;
      color:#fff; background:var(--primary); border:1px solid var(--border); border-radius:var(--radius);
      padding:13px 24px; box-shadow:none; transition:transform .18s, box-shadow .18s; }
    .btn-cta:hover { transform:translate(-2px,-2px); box-shadow:none; }
    .btn-cta mat-icon { font-size:18px; width:18px; height:18px; }
  `]
})
export class SignupSuccessComponent {}
