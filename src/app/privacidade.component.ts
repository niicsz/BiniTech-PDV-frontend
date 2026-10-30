import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AnalyticsService } from './core/analytics.service';

@Component({
  selector: 'app-privacidade',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="page">
      <article>
        <a routerLink="/" class="back"><mat-icon>west</mat-icon> Voltar</a>
        <span class="kicker">[ legal · lgpd ]</span>
        <h1>Política de Privacidade</h1>
        <p class="updated">Última atualização: 29 de outubro de 2026</p>
        <p>Esta política explica como o BiniTech PDV trata dados pessoais, conforme a Lei Geral de Proteção de Dados (Lei 13.709/2018, LGPD).</p>

        <h2>1. Quem é o controlador</h2>
        <p>O controlador dos dados tratados para a prestação do serviço é Nicolas Bezerra Bini, responsável pelo BiniTech PDV. O encarregado pelo tratamento de dados pessoais é o próprio Nicolas Bezerra Bini, pelo e-mail <a href="mailto:nicolasbbini&#64;gmail.com">nicolasbbini&#64;gmail.com</a>.</p>

        <h2>2. Dados que tratamos, finalidades e bases legais</h2>
        <ul>
          <li><strong>Cadastro da empresa</strong> (nome da empresa, e-mail de cobrança e plano): criar a conta, aprovar o cadastro, cobrar e enviar avisos do serviço. Base legal: execução de contrato (art. 7º, V).</li>
          <li><strong>Usuários da loja</strong> (nome de usuário, senha protegida por hash e perfil de acesso): autenticação e controle de permissões. Base legal: execução de contrato (art. 7º, V).</li>
          <li><strong>Pagamentos da assinatura</strong>: processados pela Stripe; não armazenamos dados de cartão. Base legal: execução de contrato (art. 7º, V) e cumprimento de obrigação legal (art. 7º, II).</li>
          <li><strong>Aceite dos Termos</strong> (data, hora, versão aceita e endereço IP): comprovar a contratação. Base legal: execução de contrato (art. 7º, V) e exercício regular de direitos (art. 7º, VI).</li>
          <li><strong>Registros de acesso</strong> (nome de usuário, loja, endereço IP, data e hora de cada login e renovação de sessão): segurança e prevenção a fraudes, guardados por 6 meses conforme o Marco Civil da Internet (art. 15 da Lei 12.965/2014) e apagados automaticamente depois disso. Base legal: obrigação legal (art. 7º, II) e legítimo interesse (art. 7º, IX).</li>
          <li><strong>Estatísticas de uso</strong> (Google Analytics, item 4): somente com o seu consentimento (art. 7º, I).</li>
        </ul>

        <h2>3. Dados dos clientes das lojas</h2>
        <p>Produtos, vendas e dados de clientes cadastrados no crediário (como nome e telefone) pertencem à loja, que é a controladora desses dados. O BiniTech PDV atua como operador (art. 39 da LGPD): trata esses dados apenas para executar o serviço, conforme as instruções da loja e os <a routerLink="/termos">Termos de uso</a>, e nunca os envia ao Google Analytics.</p>

        <h2 id="cookies">4. Cookies e estatísticas de uso</h2>
        <p>Usamos o <a href="https://policies.google.com/technologies/partner-sites?hl=pt-BR" target="_blank" rel="noopener noreferrer">Google Analytics</a> apenas se você aceitar no aviso de cookies. Ele grava os cookies <code>_ga</code> e <code>_ga_*</code> e coleta as páginas acessadas (sem parâmetros de endereço), dados técnicos do navegador e do dispositivo, localização aproximada e eventos de uso, como cadastro, login, vendas e início de pagamento, incluindo o uso feito pelos operadores de caixa. Não enviamos nomes, e-mails, nomes de usuário ou dados de clientes da loja, e os recursos de publicidade e Google Signals ficam desativados. Os eventos são mantidos pelo Google por 2 meses. Você pode mudar a sua escolha a qualquer momento:</p>
        <button type="button" class="cookie-btn" (click)="analytics.reopenConsent()">Preferências de cookies</button>
        <p>Também usamos o armazenamento local do navegador para itens necessários ao funcionamento (sessão de login, tema e cores, lembretes), que não dependem de consentimento.</p>

        <h2>5. Compartilhamento e transferência internacional</h2>
        <p>Compartilhamos dados apenas com fornecedores necessários ao serviço: Railway (hospedagem), Stripe (pagamentos), provedor de e-mail transacional e, com o seu consentimento, Google (estatísticas). Se você usar o atendimento por WhatsApp, a conversa é tratada pela Meta. Alguns desses fornecedores processam dados fora do Brasil, especialmente nos Estados Unidos; essas transferências seguem o art. 33 da LGPD, com cláusulas contratuais dos fornecedores que garantem proteção equivalente. Não vendemos dados pessoais.</p>

        <h2>6. Por quanto tempo guardamos</h2>
        <p>Os dados da conta são mantidos enquanto a assinatura estiver ativa. Depois do cancelamento da assinatura ou da reprovação do cadastro, eliminamos automaticamente, em até 90 dias, os usuários, produtos, vendas e dados de clientes da loja, e anonimizamos o cadastro da empresa. Guardamos apenas o necessário para cumprir obrigações legais: faturas e dados de cobrança, pelos prazos fiscais, e registros de acesso, por 6 meses.</p>

        <h2>7. Segurança</h2>
        <p>Usamos conexão criptografada (HTTPS), senhas protegidas por hash, controle de acesso por perfil e separação dos dados de cada loja. Se houver um incidente de segurança que possa trazer risco relevante, avisaremos os titulares afetados e a ANPD (art. 48).</p>

        <h2>8. Seus direitos</h2>
        <p>Você pode pedir a confirmação do tratamento, acesso, correção, anonimização, bloqueio ou eliminação de dados desnecessários, portabilidade, informação sobre compartilhamento, revogação do consentimento e revisão de decisões automatizadas (art. 18). Envie o pedido para <a href="mailto:nicolasbbini&#64;gmail.com">nicolasbbini&#64;gmail.com</a>; respondemos em até 15 dias. Se você é cliente de uma loja, faça o pedido à própria loja, e nós a apoiaremos. Você também pode reclamar à Autoridade Nacional de Proteção de Dados (ANPD).</p>

        <h2>9. Alterações</h2>
        <p>Podemos atualizar esta política. Mudanças relevantes serão avisadas no site ou por e-mail.</p>
      </article>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; background:var(--bg); padding:64px 24px;
      background-image:radial-gradient(circle at 85% 0%, rgba(212,57,26,0.05), transparent 40%); }
    article { max-width:720px; margin:0 auto; background:var(--surface); border:2px solid var(--text);
      border-radius:var(--radius-md); padding:48px 44px; box-shadow:10px 10px 0 var(--shadow-hard-color); }
    .back { display:inline-flex; align-items:center; gap:5px; color:var(--primary-text); font-weight:600; font-size:14px; }
    .back mat-icon { font-size:18px; width:18px; height:18px; }
    .back:hover { text-decoration:underline; }
    .kicker { display:block; margin-top:20px; font-family:var(--font-mono); font-size:12px; font-weight:600;
      letter-spacing:1px; text-transform:uppercase; color:var(--primary-text); }
    h1 { font-family:var(--font-display); font-size:42px; font-weight:800; letter-spacing:-1.5px;
      margin:8px 0 22px; color:var(--text); line-height:1; }
    h2 { font-family:var(--font-display); font-size:21px; font-weight:700; letter-spacing:-.3px;
      margin:30px 0 8px; color:var(--text); }
    p { color:var(--text-secondary); line-height:1.75; font-size:15.5px; margin:0; }
    p a, li a { color:var(--primary-text); font-weight:600; }
    .updated { font-size:13.5px; margin-bottom:14px; }
    ul { margin:0; padding-left:20px; color:var(--text-secondary); line-height:1.75; font-size:15.5px; }
    li { margin-bottom:8px; }
    li strong { color:var(--text); }
    code { font-family:var(--font-mono); font-size:13.5px; }
    .cookie-btn { margin:12px 0 14px; padding:9px 16px; background:var(--surface); color:var(--text);
      border:2px solid var(--text); border-radius:var(--radius); font:inherit; font-weight:700; font-size:14px;
      cursor:pointer; box-shadow:3px 3px 0 var(--shadow-hard-color); }
  `]
})
export class PrivacidadeComponent {
  readonly analytics = inject(AnalyticsService);
}
