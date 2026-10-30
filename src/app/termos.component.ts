import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-termos',
  standalone: true,
  imports: [RouterLink, MatIconModule],
  template: `
    <div class="page">
      <article>
        <a routerLink="/" class="back"><mat-icon>west</mat-icon> Voltar</a>
        <span class="kicker">[ legal ]</span>
        <h1>Termos de uso</h1>
        <p>Ao utilizar a plataforma BiniTech PDV, você concorda com os termos descritos abaixo.</p>
        <h2>1. Uso do serviço</h2>
        <p>O serviço é fornecido mediante assinatura de um dos planos disponíveis. O uso deve respeitar a legislação vigente.</p>
        <h2>2. Assinatura e cobrança</h2>
        <p>As assinaturas são cobradas mensalmente. O não pagamento pode resultar na suspensão do acesso.</p>
        <h2>3. Responsabilidades</h2>
        <p>O cliente é responsável pela veracidade dos dados cadastrados e pelo uso adequado das credenciais de acesso.</p>
        <h2>4. Cancelamento</h2>
        <p>A assinatura pode ser cancelada a qualquer momento, com efeito ao fim do período vigente.</p>
        <h2>5. Proteção de dados pessoais</h2>
        <p>Em relação aos dados que a loja cadastra no PDV, como produtos, vendas e dados de clientes do crediário, a loja é a controladora e o BiniTech PDV é o operador, nos termos da LGPD (Lei 13.709/2018). Nessa condição, o BiniTech PDV se compromete a:</p>
        <ul>
          <li>tratar esses dados apenas para prestar o serviço e conforme as instruções da loja dadas pela própria plataforma;</li>
          <li>manter medidas de segurança adequadas e restringir o acesso a pessoas que precisem dele para operar o serviço;</li>
          <li>usar apenas os suboperadores indicados na <a routerLink="/privacidade">Política de privacidade</a>, que seguem obrigações equivalentes;</li>
          <li>avisar a loja, sem demora injustificada, sobre incidentes de segurança que envolvam esses dados;</li>
          <li>apoiar a loja no atendimento a pedidos dos titulares e às solicitações da ANPD;</li>
          <li>eliminar esses dados em até 90 dias após o fim da assinatura, salvo obrigação legal de guarda.</li>
        </ul>
        <p>A loja é responsável por ter base legal para cadastrar os dados dos seus clientes e por informar os seus funcionários de que o uso da plataforma pode ser medido de forma estatística, sem identificação pessoal, conforme a Política de privacidade.</p>
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
    ul { margin:8px 0 12px; padding-left:20px; color:var(--text-secondary); line-height:1.75; font-size:15.5px; }
  `]
})
export class TermosComponent {}
