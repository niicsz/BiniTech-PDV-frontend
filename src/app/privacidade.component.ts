import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

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
        <p>Respeitamos a sua privacidade e protegemos os dados tratados na plataforma.</p>
        <h2>1. Dados coletados</h2>
        <p>Coletamos dados de cadastro da empresa, de usuários e informações operacionais necessárias ao funcionamento do PDV.</p>
        <h2>2. Uso dos dados</h2>
        <p>Os dados são utilizados exclusivamente para a prestação do serviço, cobrança, suporte e melhoria do produto.</p>
        <h2>3. Cookies e estatísticas de uso</h2>
        <p>Usamos o <a href="https://policies.google.com/technologies/partner-sites?hl=pt-BR" target="_blank" rel="noopener noreferrer">Google Analytics</a> para entender como a plataforma é usada e melhorá-la. Ele utiliza cookies e coleta as páginas acessadas (sem parâmetros de endereço), dados técnicos do navegador e do dispositivo, localização aproximada e eventos de uso, como cadastro, login e início de pagamento. Não enviamos nomes, e-mails, nomes de usuário ou dados de clientes da loja. Essas informações são processadas pelo Google, inclusive em servidores fora do Brasil. Você pode bloquear cookies nas configurações do navegador ou instalar o <a href="https://tools.google.com/dlpage/gaoptout?hl=pt-BR" target="_blank" rel="noopener noreferrer">complemento de desativação do Google Analytics</a>.</p>
        <h2>4. Compartilhamento</h2>
        <p>Não compartilhamos seus dados com terceiros, exceto provedores essenciais (ex.: processamento de pagamentos) e o Google Analytics, conforme o item 3.</p>
        <h2>5. Seus direitos</h2>
        <p>Você pode solicitar acesso, correção ou exclusão dos seus dados conforme a LGPD.</p>
      </article>
    </div>
  `,
  styles: [`
    .page { min-height:100vh; background:var(--bg); padding:64px 24px;
      background-image:radial-gradient(circle at 85% 0%, rgba(212,57,26,0.05), transparent 40%); }
    article { max-width:720px; margin:0 auto; background:var(--surface); border:2px solid var(--text);
      border-radius:var(--radius-md); padding:48px 44px; box-shadow:10px 10px 0 var(--text); }
    .back { display:inline-flex; align-items:center; gap:5px; color:var(--primary-dark); font-weight:600; font-size:14px; }
    .back mat-icon { font-size:18px; width:18px; height:18px; }
    .back:hover { text-decoration:underline; }
    .kicker { display:block; margin-top:20px; font-family:var(--font-mono); font-size:12px; font-weight:600;
      letter-spacing:1px; text-transform:uppercase; color:var(--primary-dark); }
    h1 { font-family:var(--font-display); font-size:42px; font-weight:800; letter-spacing:-1.5px;
      margin:8px 0 22px; color:var(--text); line-height:1; }
    h2 { font-family:var(--font-display); font-size:21px; font-weight:700; letter-spacing:-.3px;
      margin:30px 0 8px; color:var(--text); }
    p { color:var(--text-secondary); line-height:1.75; font-size:15.5px; margin:0; }
    p a { color:var(--primary-dark); font-weight:600; }
  `]
})
export class PrivacidadeComponent {}
