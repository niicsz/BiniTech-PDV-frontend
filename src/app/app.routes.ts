import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';
import { adminGuard } from './auth/guards/admin.guard';
import { superAdminGuard } from './auth/guards/super-admin.guard';
import { RouteSeo } from './core/seo.service';
import { FAQ_ITEMS } from './core/seo-content';

const seo = (data: RouteSeo) => ({ seo: data });

const homeStructuredData: Record<string, unknown> = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': 'https://www.binitechpdv.com.br/#faq',
  'url': 'https://www.binitechpdv.com.br/#faq',
  'inLanguage': 'pt-BR',
  'mainEntity': FAQ_ITEMS.map(item => ({
    '@type': 'Question',
    'name': item.q,
    'acceptedAnswer': {
      '@type': 'Answer',
      'text': item.a,
    },
  })),
};

export const routes: Routes = [
  {
    path: '',
    title: 'BiniTech PDV | Sistema de Ponto de Venda Online para Lojas',
    data: seo({
      title: 'BiniTech PDV | Sistema de Ponto de Venda Online para Lojas',
      description:
        'Sistema PDV online para mercadinhos, padarias e lojas de bairro. Frente de caixa, estoque, crediário e relatórios na nuvem — sem instalar nada. Comece grátis.',
      canonicalPath: '/',
      structuredData: homeStructuredData,
    }),
    loadComponent: () => import('./landing.component').then(m => m.LandingComponent)
  },
  {
    path: 'signup',
    title: 'Criar conta grátis | BiniTech PDV',
    data: seo({
      title: 'Criar conta grátis | BiniTech PDV',
      description:
        'Cadastre sua loja no BiniTech PDV e comece a vender em minutos. Sistema de ponto de venda online com estoque, crediário e relatórios.',
      noindex: true,
      canonicalPath: '/signup'
    }),
    loadComponent: () => import('./signup.component').then(m => m.SignupComponent)
  },
  {
    path: 'signup/success',
    title: 'Cadastro enviado | BiniTech PDV',
    data: seo({
      title: 'Cadastro enviado | BiniTech PDV',
      description: 'Seu cadastro no BiniTech PDV foi enviado e aguarda aprovação.',
      noindex: true,
      canonicalPath: '/signup/success'
    }),
    loadComponent: () => import('./signup-success.component').then(m => m.SignupSuccessComponent)
  },
  {
    path: 'sobre-nos',
    title: 'Sobre nós | BiniTech PDV — Sistema PDV para o comércio brasileiro',
    data: seo({
      title: 'Sobre nós | BiniTech PDV — Sistema PDV para o comércio brasileiro',
      description:
        'Conheça a BiniTech PDV: plataforma de ponto de venda na nuvem para pequenos e médios comércios, com estoque, caixa e relatórios.',
      canonicalPath: '/sobre-nos'
    }),
    loadComponent: () => import('./sobre-nos.component').then(m => m.SobreNosComponent)
  },
  {
    path: 'termos',
    title: 'Termos de uso | BiniTech PDV',
    data: seo({
      title: 'Termos de uso | BiniTech PDV',
      description: 'Termos de uso do BiniTech PDV, sistema de ponto de venda online.',
      canonicalPath: '/termos'
    }),
    loadComponent: () => import('./termos.component').then(m => m.TermosComponent)
  },
  {
    path: 'privacidade',
    title: 'Política de privacidade | BiniTech PDV',
    data: seo({
      title: 'Política de privacidade | BiniTech PDV',
      description: 'Política de privacidade do BiniTech PDV. Saiba como tratamos os dados da sua loja.',
      canonicalPath: '/privacidade'
    }),
    loadComponent: () => import('./privacidade.component').then(m => m.PrivacidadeComponent)
  },
  {
    path: 'login',
    title: 'Entrar | BiniTech PDV',
    data: seo({
      title: 'Entrar | BiniTech PDV',
      description: 'Acesse o BiniTech PDV com seu usuário e senha para abrir o caixa da sua loja.',
      noindex: true,
      canonicalPath: '/login'
    }),
    loadComponent: () =>
      import('./auth/components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'forgot-password',
    title: 'Recuperar senha | BiniTech PDV',
    data: seo({
      title: 'Recuperar senha | BiniTech PDV',
      description: 'Redefina a senha da sua conta BiniTech PDV.',
      noindex: true,
      canonicalPath: '/forgot-password'
    }),
    loadComponent: () =>
      import('./auth/components/forgot-password/forgot-password.component').then(
        m => m.ForgotPasswordComponent
      )
  },
  {
    path: 'reset-password',
    title: 'Nova senha | BiniTech PDV',
    data: seo({
      title: 'Nova senha | BiniTech PDV',
      description: 'Defina uma nova senha para sua conta BiniTech PDV.',
      noindex: true,
      canonicalPath: '/reset-password'
    }),
    loadComponent: () =>
      import('./auth/components/reset-password/reset-password.component').then(
        m => m.ResetPasswordComponent
      )
  },
  {
    path: 'pdv',
    title: 'Frente de caixa | BiniTech PDV',
    data: seo({ title: 'Frente de caixa | BiniTech PDV', noindex: true }),
    loadComponent: () =>
      import('./pos/components/pos-screen/pos-screen.component').then(m => m.PosScreenComponent),
    canActivate: [authGuard]
  },
  {
    path: 'products',
    title: 'Produtos | BiniTech PDV',
    data: seo({ title: 'Produtos | BiniTech PDV', noindex: true }),
    loadComponent: () =>
      import('./products/components/product-list/product-list.component').then(m => m.ProductListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sales-report',
    title: 'Relatórios | BiniTech PDV',
    data: seo({ title: 'Relatórios | BiniTech PDV', noindex: true }),
    loadComponent: () =>
      import('./sales/components/sales-report/sales-report.component').then(m => m.SalesReportComponent),
    canActivate: [authGuard]
  },
  {
    path: 'debtors',
    title: 'Devedores | BiniTech PDV',
    data: seo({ title: 'Devedores | BiniTech PDV', noindex: true }),
    loadComponent: () =>
      import('./debtors/components/debtors-list/debtors-list.component').then(m => m.DebtorsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin',
    title: 'Admin | BiniTech PDV',
    data: seo({ title: 'Admin | BiniTech PDV', noindex: true }),
    loadComponent: () => import('./admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [superAdminGuard]
  },
  {
    path: 'register',
    title: 'Cadastrar operador | BiniTech PDV',
    data: seo({ title: 'Cadastrar operador | BiniTech PDV', noindex: true }),
    loadComponent: () =>
      import('./auth/components/register/register.component').then(m => m.RegisterComponent),
    canActivate: [adminGuard]
  },
  {
    path: 'change-password',
    title: 'Alterar senha | BiniTech PDV',
    data: seo({ title: 'Alterar senha | BiniTech PDV', noindex: true }),
    loadComponent: () =>
      import('./auth/components/change-password/change-password.component').then(
        m => m.ChangePasswordComponent
      ),
    canActivate: [authGuard]
  },
  {
    path: 'billing',
    title: 'Assinatura | BiniTech PDV',
    data: seo({ title: 'Assinatura | BiniTech PDV', noindex: true }),
    loadComponent: () => import('./billing.component').then(m => m.BillingComponent),
    canActivate: [authGuard]
  }
];
