import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="page">
      <article>
        <span class="kicker">[ erro 404 ]</span>
        <h1>Página não encontrada</h1>
        <p>O endereço que você abriu não existe ou foi alterado. Confira o link ou volte para uma das páginas abaixo.</p>
        <div class="actions">
          <a class="btn-cta" routerLink="/">Ir para o início <mat-icon>arrow_forward</mat-icon></a>
          <a class="link" routerLink="/login">Entrar no sistema</a>
        </div>
      </article>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; background:var(--bg); padding:64px 24px; }
    article { max-width:720px; margin:0 auto; background:var(--surface); border:2px solid var(--text);
      border-radius:var(--radius-md); padding:48px 44px; box-shadow:10px 10px 0 var(--text); }
    .kicker { display:block; font-family:var(--font-mono); font-size:12px; font-weight:600;
      letter-spacing:1px; text-transform:uppercase; color:var(--primary-dark); }
    h1 { font-family:var(--font-display); font-size:42px; font-weight:800; letter-spacing:-1.5px;
      margin:8px 0 24px; color:var(--text); line-height:1; }
    p { color:var(--text-secondary); line-height:1.75; font-size:16px; margin:0 0 18px; }
    .actions { display:flex; flex-wrap:wrap; align-items:center; gap:18px; margin-top:14px; }
    .btn-cta { display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:15px;
      color:#fff; background:var(--primary); border:2px solid var(--text); border-radius:var(--radius);
      padding:13px 24px; box-shadow:4px 4px 0 var(--text); transition:transform .18s, box-shadow .18s; }
    .btn-cta:hover { transform:translate(-2px,-2px); box-shadow:6px 6px 0 var(--text); }
    .btn-cta mat-icon { font-size:18px; width:18px; height:18px; }
    .link { color:var(--primary-dark); font-weight:600; }
    .link:hover { text-decoration:underline; }
    @media (max-width: 600px) { article { padding:32px 22px; } h1 { font-size:32px; } }
  `]
})
export class NotFoundComponent {}
