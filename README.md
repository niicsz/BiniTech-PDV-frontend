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

## Configuração da API (runtime)

O frontend fala com o backend por outro domínio em produção. Para não precisar rebuildar a imagem
a cada mudança de URL, a base da API é lida em **runtime** de `window.__env.apiBase`:

- `public/env.js` traz o default (`apiBase` vazio → chamadas relativas a `/api`, usadas em dev via proxy).
- O `apiBaseInterceptor` (`src/app/core/api-base.interceptor.ts`) prefixa `/api` com `apiBase` quando
  ele está preenchido.
- No container, o `env.js` é regenerado no start a partir da variável **`API_BASE`**.

## Deploy (Railway)

O `Dockerfile` builda o Angular e serve os estáticos via Nginx. Variáveis do serviço:

| Variável   | Descrição                                              | Exemplo                                  |
| ---------- | ------------------------------------------------------ | ---------------------------------------- |
| `API_BASE` | URL pública do backend (sem barra final)               | `https://binitech-pdv.up.railway.app`    |
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
