import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { FAQ_ITEMS } from './core/seo-content';
import { ThemeService } from './shared/services/theme.service';

interface ShelfItem {
  id: string;
  name: string;
  unit: string;
  cents: number;
}

interface ReceiptLine {
  item: ShelfItem;
  qty: number;
}

const SHELF: ShelfItem[] = [
  { id: 'arroz', name: 'Arroz tipo 1', unit: '5 kg', cents: 2790 },
  { id: 'leite', name: 'Leite integral', unit: '1 L', cents: 529 },
  { id: 'pao', name: 'Pão de forma', unit: '400 g', cents: 899 },
  { id: 'cafe', name: 'Café torrado', unit: '500 g', cents: 1890 },
];

const CASH_STEPS = [1000, 2000, 5000, 10000, 20000];

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [CommonModule, RouterLink, MatIconModule],
  template: `
    <div class="lp">
      <header class="nav">
        <div class="wrap nav-inner">
          <a class="brand" href="#top" aria-label="BiniTech PDV, voltar ao início">
            <svg width="26" height="26" viewBox="0 0 24 24" aria-hidden="true">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <rect x="6" y="6" width="12" height="4" rx="1" class="cut" />
              <path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2" class="cut-line" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span>BiniTech PDV</span>
          </a>
          <nav class="nav-links" aria-label="Seções">
            <a href="#caixa">Caixa</a>
            <a href="#fiado">Fiado</a>
            <a href="#planos">Planos</a>
            <a href="#faq">Dúvidas</a>
          </nav>
          <div class="nav-cta">
            <button class="icon-btn" type="button" (click)="themeService.toggleTheme()"
                    [attr.aria-label]="themeService.isDarkMode() ? 'Usar tema claro' : 'Usar tema escuro'">
              <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            <a class="link" routerLink="/login">Entrar</a>
            <a class="btn btn-primary" routerLink="/signup">Criar conta grátis</a>
          </div>
        </div>
      </header>

      <main>
        <section class="hero" id="top">
          <div class="wrap hero-inner">
            <div class="hero-copy rise">
              <h1>Sistema PDV online para o seu balcão.</h1>
              <p class="lede">
                Frente de caixa, estoque, fiado e relatório do dia para mercadinhos, padarias e lojas de bairro.
                Funciona no navegador do computador que você já tem.
              </p>
              <div class="hero-actions">
                <a class="btn btn-primary btn-lg" routerLink="/signup">Criar conta grátis</a>
                <a class="btn btn-secondary btn-lg" href="#planos">Ver planos</a>
              </div>
              <p class="fine">Teste grátis, sem cartão. Planos a partir de R$ 99 por mês.</p>
            </div>

            <div class="till rise" style="animation-delay: 120ms">
              <div class="shelf" role="group" aria-label="Passe produtos no caixa">
                <p class="shelf-title">Passe um produto no caixa</p>
                <div class="shelf-items">
                  @for (item of shelf; track item.id) {
                    <button type="button" class="shelf-btn" (click)="add(item)">
                      <span>{{ item.name }} <small>{{ item.unit }}</small></span>
                      <b class="num">{{ money(item.cents) }}</b>
                    </button>
                  }
                </div>
              </div>

              <div class="receipt" aria-live="polite" data-ui>
                <p class="r-store">MERCADINHO BOM PREÇO</p>
                <p class="r-sub">CUPOM DE VENDA · CAIXA 01</p>
                <div class="r-rule"></div>
                @for (line of lines(); track line.item.id) {
                  <div class="r-line">
                    <span>{{ line.qty }}× {{ line.item.name }} {{ line.item.unit }}</span>
                    <b>{{ money(line.item.cents * line.qty) }}</b>
                  </div>
                }
                @if (lines().length === 0) {
                  <div class="r-line"><span>Toque num produto ao lado para começar.</span></div>
                }
                <div class="r-rule dashed"></div>
                <div class="r-total"><span>TOTAL</span><b>R$ {{ money(totalCents()) }}</b></div>
                <div class="pay-switch" role="group" aria-label="Forma de pagamento">
                  <button type="button" [class.on]="method() === 'pix'" [attr.aria-pressed]="method() === 'pix'" (click)="method.set('pix')">Pix</button>
                  <button type="button" [class.on]="method() === 'cash'" [attr.aria-pressed]="method() === 'cash'" (click)="method.set('cash')">Dinheiro</button>
                </div>
                @if (totalCents() === 0) {
                } @else if (method() === 'cash') {
                  <div class="r-line"><span>Recebido</span><b>{{ money(cashCents()) }}</b></div>
                  <div class="r-line r-change"><span>TROCO</span><b>{{ money(cashCents() - totalCents()) }}</b></div>
                } @else {
                  <div class="r-line"><span>Pix aprovado</span><b>{{ money(totalCents()) }}</b></div>
                }
                <div class="r-rule dashed"></div>
                <div class="r-actions">
                  <button type="button" class="r-reset" (click)="reset()">Nova venda</button>
                  <span class="r-count">{{ unitCount() }} {{ unitCount() === 1 ? 'item' : 'itens' }}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="band" id="caixa" aria-labelledby="caixa-title">
          <div class="wrap split">
            <div class="split-copy rise">
              <h2 id="caixa-title">Do código de barras ao cupom.</h2>
              <p>O leitor que você já usa funciona direto no navegador. Cada produto entra no carrinho, o total aparece grande para o cliente ver e cada forma de pagamento tem uma tecla.</p>
              <ul class="claims">
                <li><b>Pagamento dividido.</b> Parte no Pix, parte em dinheiro, com o troco calculado.</li>
                <li><b>Estoque que baixa sozinho.</b> Cada venda desconta do estoque e avisa quando sobra pouco.</li>
                <li><b>Cupom impresso.</b> Imprime na térmica de 80 mm com um clique.</li>
              </ul>
            </div>
            <figure class="fragment pos-fragment rise" data-ui aria-label="Tela da frente de caixa com três itens">
              <div class="frag-bar"><span>Frente de caixa</span><span class="muted">F4 Dinheiro · F9 Pix · F10 Fiado</span></div>
              <div class="frag-body pos-grid">
                <table class="frag-table">
                  <thead><tr><th>Produto</th><th class="r">Qtd.</th><th class="r">Subtotal</th></tr></thead>
                  <tbody>
                    <tr><td>Arroz branco tipo 1 5 kg</td><td class="r num">1</td><td class="r num">R$ 27,90</td></tr>
                    <tr><td>Leite integral 1 L</td><td class="r num">6</td><td class="r num">R$ 31,74</td></tr>
                    <tr><td>Feijão carioca 1 kg</td><td class="r num">2</td><td class="r num">R$ 16,98</td></tr>
                  </tbody>
                </table>
                <div class="frag-total">
                  <span class="muted">Total a pagar</span>
                  <b class="num">R$ 76,62</b>
                  <span class="frag-key">Pix <kbd>F9</kbd></span>
                  <span class="frag-key">Dinheiro <kbd>F4</kbd></span>
                </div>
              </div>
              <figcaption>Exemplo com dados de demonstração.</figcaption>
            </figure>
          </div>
        </section>

        <section class="field" id="fiado" aria-labelledby="fiado-title">
          <div class="wrap split reverse">
            <figure class="fragment rise" data-ui aria-label="Lista de clientes devendo no crediário">
              <div class="frag-bar"><span>Quem cobrar</span><span class="muted">R$ 114,54 a receber</span></div>
              <ul class="frag-list">
                <li><span class="av a1" aria-hidden="true">M</span><span>Dona Marta Ribeiro<small>há 12 dias</small></span><b class="num">R$ 89,06</b><span class="frag-btn">Cobrar no WhatsApp</span></li>
                <li><span class="av a2" aria-hidden="true">A</span><span>Seu Antônio da Esquina<small>há 3 dias</small></span><b class="num">R$ 25,48</b><span class="frag-btn">Cobrar no WhatsApp</span></li>
              </ul>
              <figcaption>Exemplo com dados de demonstração.</figcaption>
            </figure>
            <div class="split-copy rise">
              <h2 id="fiado-title">Fiado sem caderninho.</h2>
              <p>A venda no crediário guarda o nome e o telefone do cliente. A lista mostra quem deve há mais tempo, e a cobrança sai pronta para o WhatsApp, com o valor certo.</p>
              <ul class="claims">
                <li><b>Aviso diário.</b> O sistema lembra quando há vendas fiadas esperando cobrança.</li>
                <li><b>Um toque para quitar.</b> Marque como pago e o valor sai da lista.</li>
              </ul>
            </div>
          </div>
        </section>

        <section class="band" aria-labelledby="dia-title">
          <div class="wrap split">
            <div class="split-copy rise">
              <h2 id="dia-title">Quanto entrou hoje, e como.</h2>
              <p>O relatório separa o dinheiro por forma de pagamento, mostra o lucro sobre o custo de cada produto e quais itens mais saem. Por dia ou por período.</p>
              <ul class="claims">
                <li><b>Vários operadores.</b> Cada pessoa do caixa com seu acesso, e o dono vê tudo.</li>
                <li><b>Na nuvem.</b> Confira as vendas da loja de casa, pelo celular.</li>
              </ul>
            </div>
            <figure class="fragment rise" data-ui aria-label="Relatório de pagamentos do dia">
              <div class="frag-bar"><span>Como o dinheiro entrou</span><span class="muted">hoje</span></div>
              <ul class="frag-bars">
                @for (b of reportBars; track b.label) {
                  <li>
                    <span class="fb-row"><span>{{ b.label }}</span><b class="num">R$ {{ money(b.cents) }}</b></span>
                    <span class="fb-track"><span [class.lead]="$first" [style.width.%]="b.cents / reportBars[0].cents * 100"></span></span>
                  </li>
                }
              </ul>
              <div class="frag-sum"><span class="muted">Faturamento</span><b class="num">R$ {{ money(reportTotal) }}</b></div>
              <figcaption>Exemplo com dados de demonstração.</figcaption>
            </figure>
          </div>
        </section>

        <section class="pricing" id="planos" aria-labelledby="planos-title">
          <div class="wrap">
            <div class="pricing-head rise">
              <h2 id="planos-title">Planos pelo tamanho da loja.</h2>
              <p>Todos com frente de caixa, estoque, relatórios e acesso pelo navegador. Troque de plano quando quiser.</p>
            </div>
            <div class="plan-table rise" role="table" aria-label="Comparação de planos">
              <div class="pt-row pt-head" role="row">
                <span role="columnheader"><span class="sr-only">Recurso</span></span>
                @for (p of plans; track p.name) {
                  <span role="columnheader" class="pt-plan" [class.pt-featured]="p.featured">
                    <b>{{ p.name }}</b>
                    <span class="pt-price"><span class="num">R$ {{ p.price }}</span> por mês</span>
                    @if (p.featured) { <span class="pt-note">o mais escolhido</span> }
                  </span>
                }
              </div>
              @for (row of planRows; track row.label) {
                <div class="pt-row" role="row">
                  <span role="rowheader">{{ row.label }}</span>
                  @for (v of row.values; track $index) {
                    <span role="cell" class="num" [class.pt-featured]="plans[$index].featured">
                      @if (v === true) { <mat-icon aria-label="Incluído">check</mat-icon> }
                      @else if (v === false) { <span class="muted" aria-label="Não incluído">—</span> }
                      @else { {{ v }} }
                    </span>
                  }
                </div>
              }
              <div class="pt-row pt-foot" role="row">
                <span role="cell"></span>
                @for (p of plans; track p.name) {
                  <span role="cell" [class.pt-featured]="p.featured">
                    <a class="btn" [class.btn-primary]="p.featured" [class.btn-secondary]="!p.featured" routerLink="/signup">Começar no {{ p.name }}</a>
                  </span>
                }
              </div>
            </div>
          </div>
        </section>

        <section class="faq" id="faq" aria-labelledby="faq-heading">
          <div class="wrap faq-inner">
            <div class="faq-head">
              <h2 id="faq-heading">Perguntas sobre o sistema PDV.</h2>
              <p>Não achou a sua? Fale com a gente pelo WhatsApp, no botão de ajuda.</p>
            </div>
            <div class="faq-list">
              @for (item of faqs; track item.q) {
                <details class="faq-item">
                  <summary>{{ item.q }}</summary>
                  <p>{{ item.a }}</p>
                </details>
              }
            </div>
          </div>
        </section>
      </main>

      <footer class="footer">
        <div class="wrap">
          <div class="footer-cta">
            <p>Abra o caixa ainda hoje.</p>
            <a class="btn btn-inverse btn-lg" routerLink="/signup">Criar conta grátis</a>
          </div>
          <div class="footer-cols">
            <nav aria-label="Produto">
              <a href="#caixa">Frente de caixa</a>
              <a href="#fiado">Crediário</a>
              <a href="#planos">Planos</a>
              <a routerLink="/login">Entrar</a>
            </nav>
            <nav aria-label="Empresa">
              <a routerLink="/sobre-nos">Sobre nós</a>
              <a routerLink="/termos">Termos de uso</a>
              <a routerLink="/privacidade">Privacidade</a>
            </nav>
          </div>
          <p class="footer-name" aria-hidden="true">BiniTech PDV</p>
          <p class="footer-legal">© {{ year }} BiniTech PDV · Feito para o comércio de bairro</p>
        </div>
      </footer>
    </div>
  `,
  styles: [`
    .lp { background: var(--bg); color: var(--text); overflow-x: hidden; }
    .wrap { max-width: 1240px; margin: 0 auto; padding: 0 32px; }
    .lp a:hover { text-decoration: none; }

    .btn { display: inline-flex; align-items: center; justify-content: center; height: 44px; padding: 0 18px;
      border-radius: 6px; border: 1px solid transparent; font-weight: 500; white-space: nowrap;
      transition: background-color 120ms var(--ease), transform 120ms var(--ease); }
    .btn:active { transform: scale(.98); }
    .btn-lg { height: 52px; padding: 0 24px; font-size: 16px; }
    .btn-primary { background: var(--primary); color: var(--surface); }
    .btn-primary:hover { background: var(--primary-light); }
    .btn-secondary { background: var(--surface); color: var(--text); border-color: var(--control); }
    .btn-secondary:hover { background: var(--surface-hover); }
    .btn-inverse { background: #f4f3f1; color: #0a0a0a; }
    .btn-inverse:hover { background: #ffffff; }
    .icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px;
      border: 0; border-radius: 6px; background: transparent; color: var(--text-secondary); }
    .icon-btn:hover { background: var(--primary-bg); color: var(--text); }
    .muted { color: var(--text-secondary); }

    .nav { position: sticky; top: 0; z-index: 50; background: var(--bg); border-bottom: 1px solid var(--border); }
    .nav-inner { display: flex; align-items: center; gap: 32px; height: 64px; }
    .brand { display: inline-flex; align-items: center; gap: 10px; color: var(--text); font-weight: 600; font-size: 16px; }
    .brand svg { color: var(--primary); }
    .brand .cut { fill: var(--bg); }
    .brand .cut-line { stroke: var(--bg); }
    .nav-links { display: flex; gap: 24px; }
    .nav-links a { color: var(--text-secondary); font-weight: 500; }
    .nav-links a:hover { color: var(--text); }
    .nav-cta { margin-left: auto; display: flex; align-items: center; gap: 12px; }
    .link { color: var(--text); font-weight: 500; padding: 0 8px; }

    .hero-inner { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, .9fr); gap: 56px;
      align-items: center; padding-top: 72px; padding-bottom: 120px; }
    h1 { font-size: clamp(38px, 4.6vw, 64px); line-height: 1; letter-spacing: -.04em; font-weight: 600; max-width: 19ch; }
    .lede { margin-top: 32px; max-width: 520px; font-size: 19px; line-height: 29px; color: var(--text); }
    .hero-actions { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 32px; }
    .fine { margin-top: 16px; color: var(--text-secondary); }

    .till { display: grid; grid-template-columns: 200px minmax(0, 1fr); gap: 16px; align-items: start; }
    .shelf-title { font-weight: 500; margin-bottom: 8px; }
    .shelf-items { display: flex; flex-direction: column; gap: 8px; }
    .shelf-btn { display: flex; flex-direction: column; align-items: flex-start; gap: 2px; min-height: 56px; padding: 8px 12px;
      border: 1px solid var(--control); border-radius: 6px; background: var(--surface); color: var(--text); text-align: left;
      transition: background-color 120ms var(--ease), transform 120ms var(--ease); }
    .shelf-btn:hover { background: var(--primary-bg); }
    .shelf-btn:active { transform: scale(.98); }
    .shelf-btn small { color: var(--text-secondary); }
    .shelf-btn b { font-weight: 500; }
    .receipt { background: #fff; color: #0a0a0a; padding: 24px 22px 18px; font-family: var(--font-mono); font-size: 13px; line-height: 20px;
      border: 1px solid #e4e2de;
      -webkit-mask: radial-gradient(7px at 7px 100%, #0000 98%, #000) repeat-x 0 100%/18px 7px, linear-gradient(#000 0 0) no-repeat 0 0/100% calc(100% - 7px);
      mask: radial-gradient(7px at 7px 100%, #0000 98%, #000) repeat-x 0 100%/18px 7px, linear-gradient(#000 0 0) no-repeat 0 0/100% calc(100% - 7px); }
    .r-store { text-align: center; font-weight: 500; font-size: 14px; }
    .r-sub { text-align: center; color: #6b6b68; font-size: 11px; }
    .r-rule { border-top: 1px solid #0a0a0a; margin: 10px 0; }
    .r-rule.dashed { border-top: 1px dashed #b8b5ae; }
    .r-line, .r-total { display: flex; justify-content: space-between; gap: 12px; }
    .r-line span { color: #3a3a38; }
    .r-line b { font-weight: 400; }
    .r-total { font-size: 15px; font-weight: 500; margin-bottom: 8px; }
    .r-total b { font-size: 22px; font-weight: 500; }
    .r-change b { font-weight: 600; }
    .pay-switch { display: inline-flex; gap: 4px; margin-bottom: 8px; }
    .pay-switch button { height: 28px; padding: 0 10px; border: 1px solid #cfccc6; border-radius: 4px; background: #fff;
      font-family: var(--font-family); font-size: 13px; color: #0a0a0a; }
    .pay-switch button.on { background: #0a0a0a; color: #fff; border-color: #0a0a0a; }
    .r-actions { display: flex; justify-content: space-between; align-items: center; }
    .r-reset { border: 0; background: none; font-family: var(--font-family); text-decoration: underline; text-underline-offset: 3px; color: #0a0a0a; padding: 0; }
    .r-count { color: #6b6b68; font-size: 12px; }

    .band, .field { padding: 120px 0; }
    .field { background: #141414; color: #f4f3f1; }
    .field .split-copy p, .field .claims li { color: #d4d4d1; }
    .split { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 64px; align-items: center; }
    .split.reverse { grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); }
    h2 { font-size: clamp(30px, 3.6vw, 48px); line-height: 1.04; letter-spacing: -.03em; font-weight: 600; max-width: 16ch; }
    .split-copy p { margin-top: 20px; font-size: 18px; line-height: 28px; max-width: 520px; }
    .claims { list-style: none; margin: 28px 0 0; padding: 0; display: flex; flex-direction: column; gap: 14px; max-width: 520px; }
    .claims li { font-size: 16px; line-height: 24px; color: var(--text-secondary); }
    .claims b { color: inherit; font-weight: 600; }
    .band .claims b { color: var(--text); }
    .field .claims b { color: #fff; }

    .fragment { margin: 0; background: var(--surface); color: var(--text); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .field .fragment { border-color: #2a2a2a; }
    .frag-bar { display: flex; justify-content: space-between; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); font-weight: 600; }
    .frag-bar .muted { font-weight: 400; font-size: 13px; }
    .fragment figcaption { padding: 10px 20px; border-top: 1px solid var(--border-light); color: var(--text-secondary); font-size: 12px; }
    .pos-grid { display: grid; grid-template-columns: minmax(0, 1fr) 200px; }
    .frag-table { width: 100%; border-collapse: collapse; }
    .frag-table th { height: 36px; padding: 0 16px; text-align: left; font-weight: 400; font-size: 12px; color: var(--text-secondary); border-bottom: 1px solid var(--border); }
    .frag-table td { height: 52px; padding: 0 16px; border-bottom: 1px solid var(--border-light); }
    .frag-table .r { text-align: right; white-space: nowrap; }
    .frag-total { display: flex; flex-direction: column; gap: 6px; padding: 16px; border-left: 1px solid var(--border); }
    .frag-total b { font-size: 30px; line-height: 36px; font-weight: 500; letter-spacing: -.02em; margin-bottom: 8px; }
    .frag-key { display: flex; justify-content: space-between; align-items: center; height: 36px; padding: 0 10px; border: 1px solid var(--control); border-radius: 6px; }
    kbd { padding: 0 5px; border: 1px solid var(--control); border-radius: 4px; font-family: var(--font-mono); font-size: 11px; }
    .frag-list { list-style: none; margin: 0; padding: 0; }
    .frag-list li { display: grid; grid-template-columns: 36px minmax(0, 1fr) auto auto; gap: 12px; align-items: center; min-height: 68px; padding: 0 20px; border-bottom: 1px solid var(--border-light); }
    .frag-list li span small { display: block; color: var(--text-secondary); font-size: 12px; }
    .frag-list b { font-weight: 500; font-size: 17px; }
    .av { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 50%; font-weight: 600; }
    .a1 { background: #f6e3cf; color: #6b3a10; }
    .a2 { background: #dbe7f7; color: #0d3a7a; }
    .frag-btn { height: 34px; display: inline-flex; align-items: center; padding: 0 12px; border: 1px solid var(--control); border-radius: 6px; font-size: 13px; font-weight: 500; }
    .frag-bars { list-style: none; margin: 0; padding: 8px 20px; }
    .frag-bars li { padding: 10px 0; border-bottom: 1px solid var(--border-light); }
    .fb-row { display: flex; justify-content: space-between; }
    .fb-row b { font-weight: 500; }
    .fb-track { display: block; height: 4px; margin-top: 8px; }
    .fb-track span { display: block; height: 100%; border-radius: 2px; background: #9a9893; }
    .fb-track span.lead { background: var(--accent); }
    .frag-sum { display: flex; justify-content: space-between; align-items: baseline; padding: 12px 20px; }
    .frag-sum b { font-size: 24px; font-weight: 500; }

    .pricing { padding: 120px 0; border-top: 1px solid var(--border); }
    .pricing-head p { margin-top: 16px; font-size: 18px; line-height: 28px; max-width: 560px; color: var(--text-secondary); }
    .plan-table { margin-top: 48px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; overflow: hidden; }
    .pt-row { display: grid; grid-template-columns: minmax(180px, 1.3fr) repeat(3, minmax(0, 1fr)); min-height: 52px; border-bottom: 1px solid var(--border-light); }
    .pt-row > span { display: flex; align-items: center; padding: 10px 20px; }
    .pt-row > span:not(:first-child) { justify-content: center; text-align: center; }
    .pt-featured { background: var(--surface-alt); }
    .pt-head .pt-plan { flex-direction: column; gap: 2px; padding: 24px 20px; }
    .pt-plan b { font-size: 18px; font-weight: 600; }
    .pt-price { color: var(--text-secondary); }
    .pt-price .num { font-size: 32px; line-height: 40px; color: var(--text); font-weight: 500; letter-spacing: -.02em; }
    .pt-note { font-size: 13px; color: var(--accent); font-weight: 500; }
    .pt-row mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .pt-foot { border-bottom: 0; }
    .pt-foot > span { padding: 16px 20px 20px; }
    .pt-foot .btn { width: 100%; }

    .faq { padding: 120px 0; border-top: 1px solid var(--border); }
    .faq-inner { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 64px; align-items: start; }
    .faq-head p { margin-top: 16px; color: var(--text-secondary); font-size: 17px; max-width: 420px; }
    .faq-list { border-top: 1px solid var(--border); }
    .faq-item { border-bottom: 1px solid var(--border); }
    .faq-item summary { position: relative; list-style: none; cursor: pointer; padding: 20px 40px 20px 0; font-size: 18px; font-weight: 500; }
    .faq-item summary::-webkit-details-marker { display: none; }
    .faq-item summary::after { content: '+'; position: absolute; right: 4px; top: 50%; transform: translateY(-50%); font-size: 22px; color: var(--text-secondary); transition: transform 160ms var(--ease); }
    .faq-item[open] summary::after { transform: translateY(-50%) rotate(45deg); }
    .faq-item p { padding: 0 40px 20px 0; color: var(--text-secondary); font-size: 16px; line-height: 26px; }

    .footer { background: #141414; color: #d4d4d1; padding: 96px 0 32px; }
    .footer-cta { display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
    .footer-cta p { font-size: clamp(28px, 3.4vw, 44px); font-weight: 600; letter-spacing: -.03em; color: #fff; }
    .footer-cols { display: flex; gap: 64px; margin-top: 64px; }
    .footer-cols nav { display: flex; flex-direction: column; gap: 10px; }
    .footer-cols a { color: #d4d4d1; }
    .footer-cols a:hover { color: #fff; }
    .footer-name { margin-top: 64px; font-size: clamp(56px, 12.5vw, 184px); line-height: .85; font-weight: 600; letter-spacing: -.05em; color: #fff; white-space: nowrap; }
    .footer-legal { margin-top: 24px; font-size: 13px; color: #949494; }

    .rise { opacity: 0; transform: translateY(20px); animation: rise 600ms var(--ease) forwards; }
    @keyframes rise { to { opacity: 1; transform: none; } }

    @media (max-width: 1040px) {
      .hero-inner, .split, .split.reverse, .faq-inner { grid-template-columns: 1fr; gap: 40px; }
      .split.reverse .fragment { order: 2; }
      .band, .field, .pricing, .faq { padding: 88px 0; }
    }
    @media (max-width: 720px) {
      .wrap { padding: 0 16px; }
      .nav-links, .link { display: none; }
      .nav-inner { gap: 12px; }
      .hero-inner { padding-top: 40px; padding-bottom: 72px; }
      .lede { margin-top: 24px; font-size: 17px; line-height: 26px; }
      .hero-actions .btn { flex: 1 1 100%; }
      .till { grid-template-columns: 1fr; }
      .shelf-items { display: grid; grid-template-columns: 1fr 1fr; }
      .pos-grid { grid-template-columns: 1fr; }
      .frag-total { border-left: 0; border-top: 1px solid var(--border); }
      .frag-list li { grid-template-columns: 36px minmax(0, 1fr) auto; padding: 10px 16px; }
      .frag-btn { grid-column: 2 / -1; justify-self: start; }
      .pt-row { grid-template-columns: 1fr 1fr 1fr; }
      .pt-row > span:first-child { grid-column: 1 / -1; padding-bottom: 0; color: var(--text-secondary); font-size: 13px; }
      .pt-head > span:first-child, .pt-foot > span:first-child { display: none; }
      .pt-row > span { padding: 8px; }
      .pt-head .pt-plan { padding: 16px 8px; }
      .pt-price .num { font-size: 22px; line-height: 28px; }
      .pt-foot .btn { height: 40px; padding: 0 8px; font-size: 13px; white-space: normal; }
      .footer-cols { gap: 40px; margin-top: 48px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .rise { opacity: 1; transform: none; animation: none; }
    }
  `]
})
export class LandingComponent {
  readonly themeService = inject(ThemeService);
  readonly year = new Date().getFullYear();
  readonly faqs = FAQ_ITEMS;
  readonly shelf = SHELF;

  private readonly initial: ReceiptLine[] = [
    { item: SHELF[0], qty: 1 },
    { item: SHELF[1], qty: 2 },
    { item: SHELF[3], qty: 1 }
  ];

  readonly lines = signal<ReceiptLine[]>(this.initial.map(l => ({ ...l })));
  readonly method = signal<'pix' | 'cash'>('pix');
  readonly totalCents = computed(() => this.lines().reduce((sum, l) => sum + l.item.cents * l.qty, 0));
  readonly unitCount = computed(() => this.lines().reduce((sum, l) => sum + l.qty, 0));
  readonly cashCents = computed(() => {
    const total = this.totalCents();
    return CASH_STEPS.find(step => step >= total) ?? Math.ceil(total / 5000) * 5000;
  });

  readonly reportBars = [
    { label: 'Pix', cents: 14398 },
    { label: 'Crediário', cents: 13302 },
    { label: 'Cartão de débito', cents: 7878 },
    { label: 'Dinheiro', cents: 7722 },
    { label: 'Cartão de crédito', cents: 5017 }
  ];
  readonly reportTotal = this.reportBars.reduce((sum, b) => sum + b.cents, 0);

  readonly plans = [
    { name: 'Starter', price: 99, featured: false },
    { name: 'Pro', price: 199, featured: true },
    { name: 'Enterprise', price: 349, featured: false }
  ];

  readonly planRows: { label: string; values: (string | boolean)[] }[] = [
    { label: 'Produtos cadastrados', values: ['até 200', 'até 500', 'até 2.000'] },
    { label: 'Vendas por mês', values: ['até 300', 'até 1.000', 'até 5.000'] },
    { label: 'Operadores de caixa', values: ['1', '3', '10'] },
    { label: 'Frente de caixa e estoque', values: [true, true, true] },
    { label: 'Relatórios de vendas', values: [true, true, true] },
    { label: 'Crediário e devedores', values: [false, true, true] },
    { label: 'Suporte prioritário', values: [false, true, true] }
  ];

  add(item: ShelfItem): void {
    this.lines.update(lines => {
      const existing = lines.find(l => l.item.id === item.id);
      if (existing) {
        return lines.map(l => (l.item.id === item.id ? { ...l, qty: l.qty + 1 } : l));
      }
      return [...lines, { item, qty: 1 }];
    });
  }

  reset(): void {
    this.lines.set([]);
  }

  money(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
}
