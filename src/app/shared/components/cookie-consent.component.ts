import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { AnalyticsService } from '../../core/analytics.service';

@Component({
  selector: 'app-cookie-consent',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    @if (analytics.consentPending) {
      <section class="cookie-consent" role="dialog" aria-live="polite" aria-labelledby="cookie-consent-title">
        <h2 id="cookie-consent-title">Cookies de estatística</h2>
        <p>
          Usamos o Google Analytics para entender como o BiniTech PDV é usado e melhorá-lo. Ele só é ativado
          se você aceitar. Saiba mais na <a routerLink="/privacidade">Política de privacidade</a>.
        </p>
        <div class="actions">
          <button mat-stroked-button type="button" (click)="analytics.setConsent('denied')">Recusar</button>
          <button mat-stroked-button type="button" (click)="analytics.setConsent('granted')">Aceitar</button>
        </div>
      </section>
    }
  `,
  styles: [`
    .cookie-consent { position:fixed; left:16px; bottom:16px; z-index:1001; max-width:420px;
      width:calc(100% - 32px); background:var(--surface); color:var(--text); border:2px solid var(--text);
      border-radius:var(--radius-md); box-shadow:6px 6px 0 var(--text); padding:18px 20px; }
    h2 { font-family:var(--font-display); font-size:17px; font-weight:700; margin:0 0 6px; }
    p { font-size:13.5px; line-height:1.55; color:var(--text-secondary); margin:0 0 14px; }
    p a { color:var(--primary-dark); font-weight:600; }
    .actions { display:flex; gap:10px; justify-content:flex-end; }
    .actions button { flex:1; font-weight:700; }
  `]
})
export class CookieConsentComponent {
  readonly analytics = inject(AnalyticsService);
}
