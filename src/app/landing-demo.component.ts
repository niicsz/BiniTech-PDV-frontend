import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsService } from './core/analytics.service';

@Component({
  selector: 'app-landing-demo',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <section class="demo" id="demo" aria-labelledby="demo-heading">
      <div class="demo-inner">
        <div class="demo-copy">
          <span class="kicker">[ veja funcionando ]</span>
          <h2 id="demo-heading">Do pedido no celular<br /> à venda no caixa</h2>
          <ol class="demo-steps">
            <li><b>O cliente abre o seu cardápio</b> pelo link da loja e escolhe os produtos.</li>
            <li><b>O pedido chega no seu WhatsApp</b> com itens, endereço, troco e observação.</li>
            <li><b>Você aceita e conclui</b>: a venda entra no relatório e o estoque baixa sozinho.</li>
          </ol>
          <a class="cta" routerLink="/signup" (click)="track()">
            Testar 7 dias grátis <mat-icon>arrow_forward</mat-icon>
          </a>
        </div>
        <div class="demo-phone">
          <video src="media/demo-delivery.mp4" poster="media/demo-delivery.jpg" width="540" height="960"
                 autoplay [muted]="true" loop playsinline preload="metadata"
                 aria-label="Demonstração: cardápio no celular, pedido no WhatsApp e painel de pedidos do BiniTech PDV"></video>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .demo{ padding:88px 0 24px; }
    .demo-inner{ width:min(1144px, calc(100% - 56px)); margin:0 auto; display:grid; grid-template-columns:1.1fr .9fr; gap:56px; align-items:center; }
    .kicker{ font-family:'Spline Sans Mono',monospace; font-size:13px; font-weight:600; letter-spacing:1px; text-transform:uppercase; color:var(--primary-text); }
    h2{ font-family:'Fraunces',serif; font-weight:800; font-size:clamp(34px,4.4vw,52px); line-height:1.02; letter-spacing:-1.5px; margin:12px 0 26px; color:var(--ink); text-wrap:balance; }
    .demo-steps{ list-style:none; counter-reset:step; padding:0; margin:0 0 32px; display:flex; flex-direction:column; gap:18px; }
    .demo-steps li{ counter-increment:step; position:relative; padding-left:54px; font-size:16.5px; line-height:1.55; color:var(--ink-2); }
    .demo-steps li::before{ content:counter(step); position:absolute; left:0; top:-2px; width:36px; height:36px; display:grid; place-items:center;
      background:var(--vermillion); color:#fff; border:2px solid var(--ink); border-radius:3px; font-family:'Spline Sans Mono',monospace; font-weight:700; }
    .demo-steps b{ color:var(--ink); }
    .cta{ display:inline-flex; align-items:center; gap:8px; font-weight:700; font-size:16px; line-height:1; padding:16px 26px;
      background:var(--vermillion); color:#fff; border:2px solid var(--ink); border-radius:2px; text-decoration:none;
      box-shadow:4px 4px 0 var(--ink); transition:transform .18s, box-shadow .18s; }
    .cta:hover{ transform:translate(-2px,-2px); box-shadow:6px 6px 0 var(--ink); }
    .cta:focus-visible{ outline:3px solid var(--ochre); outline-offset:3px; }
    .cta mat-icon{ font-size:18px; width:18px; height:18px; }
    .demo-phone{ justify-self:center; width:min(320px, 100%); padding:12px; background:#111; border-radius:44px; box-shadow:10px 10px 0 var(--ink); }
    video{ display:block; width:100%; height:auto; aspect-ratio:9/16; border-radius:34px; background:#241a12; }
    @media (max-width: 860px){ .demo-inner{ grid-template-columns:1fr; gap:36px; } .demo-phone{ width:min(280px, 80%); } }
  `],
})
export class LandingDemoComponent {
  private readonly analytics = inject(AnalyticsService);

  track(): void {
    this.analytics.track('landing_cta', { position: 'demo' });
  }
}
