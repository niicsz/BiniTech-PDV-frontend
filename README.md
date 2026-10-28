# BiniTech PDV — Frontend

Aplicação web (SPA) do **BiniTech PDV**, um sistema de Ponto de Venda SaaS multi-tenant.
Inclui a landing page, o fluxo de cadastro/login, o PDV em si, gestão de produtos, relatórios,
devedores e a tela de billing (assinatura via Stripe).

Backend (API Spring Boot): **[niicsz/BiniTech-PDV](https://github.com/niicsz/BiniTech-PDV)**.

## Stack

- Angular 21 (standalone APIs, `@angular/build:application`)
- Angular Material
- TypeScript 5.9
- Nginx (servir os estáticos em produção)

## Pré-requisitos

- Node.js 25
- Backend rodando (local em `http://localhost:8080` ou a URL pública)

## Rodar em desenvolvimento

```bash
npm ci
npm start
```

`npm start` usa `ng serve` com `proxy.conf.json`, que encaminha as chamadas `/api` para
`http://localhost:8080`. A app sobe em `http://localhost:4200`.

## Build de produção

```bash
npm run build -- --configuration=production
```

Saída em `dist/binitech-pdv-frontend/browser`.

O build de produção mantém `optimization.styles.inlineCritical: false` para carregar
o CSS completo por um link normal, compatível com a CSP `script-src 'self'`.
Ativar a extração de CSS crítico gera um handler inline `onload`, bloqueado pela
CSP, e impede que os estilos do tema escuro sejam aplicados.

## Testes de renovação da sessão

A revisão de importações oferece páginas de 10, 25, 50, 100 ou 200 produtos,
ordenadas por linha do arquivo. Os botões Primeira, Anterior, Próxima e Última
consultam a API paginada; as decisões sobre produtos existentes são salvas no servidor.

Execute `npm run test:auth` com Node.js 24 ou superior. Os testes também rodam no CI.
Erros da requisição reenviada (incluindo importações) não encerram a sessão.
O logout ocorre se o Auth rejeitar a renovação com 401/403; indisponibilidade
temporária preserva as credenciais. Requisições concorrentes compartilham a renovação.

## Configuração da API (runtime)

O frontend fala com o backend por outro domínio em produção. Para não precisar rebuildar a imagem
a cada mudança de URL, a base da API é lida em **runtime** de `window.__env.apiBase`:

- `public/env.js` traz o default (`apiBase` vazio → chamadas relativas a `/api`, usadas em dev via proxy).
- O `apiBaseInterceptor` (`src/app/core/api-base.interceptor.ts`) prefixa `/api` com `apiBase` quando
  ele está preenchido.
- No container, o `env.js` é regenerado no start a partir da variável **`API_BASE`**.
- As chamadas de importação usam `window.__env.importApiBase`, gerado a partir de
  **`IMPORT_API_BASE`**. A política CSP `connect-src` permite somente o próprio frontend
  e as URLs configuradas em `API_BASE` e `IMPORT_API_BASE` (além dos domínios do Google Analytics).

## Analytics (Google Analytics 4)

O `AnalyticsService` (`src/app/core/analytics.service.ts`) carrega o `gtag.js` em runtime quando
`window.__env.gaMeasurementId` está preenchido (gerado a partir de **`GA_MEASUREMENT_ID`**). Ele equivale
ao snippet oficial do Google, mas não usa `<script>` inline, que a CSP bloqueia.

- Em dev (`public/env.js`) o ID fica vazio, então nada é enviado. Na imagem Docker o padrão é `G-YD372YEZ1H`.
- `page_view` é enviado a cada troca de rota, **sem query string/hash** (não vaza o token de `/reset-password`).
  No GA, desative *Admin → Fluxos de dados → Medição otimizada → Visualizações de página → "Mudanças
  de página com base em eventos do histórico do navegador"* para não duplicar pageviews nem enviar URLs com token.
- Eventos:
  - Landing/aquisição: `landing_cta` (`position`, `plan`), `pricing_viewed`, `faq_opened` (`question_index`),
    `sign_up` (`plan`), `signup_form_error` (`field`, `status`).
  - Acesso: `login` (`role`), `login_failed` (`status`), `password_reset_requested`, `password_reset_completed`.
  - Ativação: `first_product_created`, `first_sale_completed`, `user_invited` (`role`). Os "first_" são enviados uma
    vez por loja/navegador (marcador no `localStorage`; a primeira venda é confirmada com uma consulta à API).
  - Uso: `sale_completed` (`value`, `payment_method`, `items_count`, `on_credit`…), `payment_failed` (`reason`),
    `sale_canceled`, `item_removed_from_cart`, `search` (`search_term`, só texto digitado), `product_not_found`,
    `product_created`, `product_import` (`status`, `rows`, `created`…), `report_viewed` (`period`), `debt_paid`,
    `settings_changed` (`setting`).
  - Assinatura: `begin_checkout`, `purchase` (volta do Stripe em `/billing?status=success`), `checkout_abandoned`,
    `manage_subscription_opened`, `plan_changed` (`from`, `to`), `subscription_canceled`, `plan_limit_exceeded`
    (fatura com excedente). Troca/cancelamento são detectados comparando com o último estado visto neste navegador.
- Propriedades do usuário: `role`, `plan`, `subscription_status`, `tenant_age`.
- No GA, marque como eventos principais: `sign_up`, `first_sale_completed` e `purchase`.
- Nunca envie dados pessoais em `analytics.track(...)`.

## Deploy (Railway)

O `Dockerfile` builda o Angular e serve os estáticos via Nginx. Variáveis do serviço:

| Variável   | Descrição                                              | Exemplo                                  |
| ---------- | ------------------------------------------------------ | ---------------------------------------- |
| `API_BASE` | URL pública do backend (sem barra final)               | `https://www.binitechpdv.com.br`    |
| `IMPORT_API_BASE` | URL pública do microsserviço importador (sem barra final) | `https://binitech-product-import-production.up.railway.app` |
| `GA_MEASUREMENT_ID` | ID do Google Analytics 4 (opcional; padrão da imagem `G-YD372YEZ1H`, vazio desabilita) | `G-YD372YEZ1H` |
| `PORT`     | Porta de escuta do Nginx (injetada pelo Railway)       | `8080`                                   |

> O domínio público deste serviço precisa estar liberado no CORS do backend
> (`CORS_ALLOWED_ORIGINS`) e configurado como `APP_FRONTEND_URL`.

## Estrutura

```
src/app/
  auth/        autenticação (login, registro, interceptors)
  core/        apiBaseInterceptor
  pos/         tela de venda, produtos, pagamento
  products/    gestão de produtos
  sales/       relatórios de vendas
  debtors/     devedores
nginx/         template de configuração do Nginx
docker-entrypoint.d/   geração do env.js em runtime
```
