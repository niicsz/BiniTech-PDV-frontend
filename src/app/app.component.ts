import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { filter } from 'rxjs/operators';
import { AuthService } from './auth/services/auth.service';
import { ThemeService } from './shared/services/theme.service';
import { SettingsModalComponent } from './shared/components/settings-modal.component';
import { SaleService } from './pos/services/sale.service';
import { SeoService } from './core/seo.service';

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Administração da plataforma',
  ADMIN: 'Administrador',
  TENANT_ADMIN: 'Administrador da loja',
  OPERATOR: 'Operador de caixa'
};

const HELP_URL = 'https://wa.me/5511958710404?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20o%20BiniTech%20PDV.';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule, RouterOutlet, RouterLink, RouterLinkActive,
    MatButtonModule, MatIconModule, MatTooltipModule, MatSnackBarModule,
    SettingsModalComponent
  ],
  template: `
    @if (authService.isLoggedIn() && !isPublicRoute()) {
      <header class="app-header">
        <div class="header-inner">
          <a class="brand" [routerLink]="authService.isSuperAdmin() ? '/admin' : '/pdv'" aria-label="BiniTech PDV, início">
            <svg class="mark" width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <rect width="24" height="24" rx="6" fill="currentColor" />
              <rect x="6" y="6" width="12" height="4" rx="1" class="mark-cut" />
              <path d="M7 14h2M11 14h2M15 14h2M7 17h2M11 17h2M15 17h2" class="mark-keys" stroke-width="1.6" stroke-linecap="round" />
            </svg>
            <span class="brand-name">BiniTech PDV</span>
          </a>

          <nav class="nav-links" aria-label="Principal">
            @for (item of navItems(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" class="nav-item">
                {{ item.label }}
                @if (item.count) {
                  <span class="nav-count num" [attr.aria-label]="item.count + ' pendentes'">{{ item.count }}</span>
                }
              </a>
            }
          </nav>

          <div class="toolbar-actions">
            <a class="text-action" [href]="helpUrl" target="_blank" rel="noopener noreferrer">Ajuda</a>
            <button type="button" class="icon-action" [matTooltip]="themeService.isDarkMode() ? 'Usar tema claro' : 'Usar tema escuro'"
                    [attr.aria-label]="themeService.isDarkMode() ? 'Usar tema claro' : 'Usar tema escuro'" (click)="themeService.toggleTheme()">
              <mat-icon>{{ themeService.isDarkMode() ? 'light_mode' : 'dark_mode' }}</mat-icon>
            </button>
            @if (!authService.isSuperAdmin()) {
              <a class="icon-action" matTooltip="Alterar senha" aria-label="Alterar senha" routerLink="/change-password">
                <mat-icon>key</mat-icon>
              </a>
            }
            <button type="button" class="icon-action" matTooltip="Aparência" aria-label="Aparência" (click)="showSettings = true">
              <mat-icon>tune</mat-icon>
            </button>

            <div class="user">
              <span class="avatar" aria-hidden="true">{{ initial() }}</span>
              <span class="user-details">
                <span class="user-name">{{ authService.getUsername() }}</span>
                <span class="user-role">{{ roleLabel() }}</span>
              </span>
            </div>

            <button type="button" class="icon-action" matTooltip="Sair" aria-label="Sair" (click)="onLogout()">
              <mat-icon>logout</mat-icon>
            </button>

            <button type="button" class="icon-action menu-toggle" [attr.aria-expanded]="menuOpen()" aria-controls="mobile-menu"
                    aria-label="Menu" (click)="menuOpen.set(!menuOpen())">
              <mat-icon>{{ menuOpen() ? 'close' : 'menu' }}</mat-icon>
            </button>
          </div>
        </div>

        @if (menuOpen()) {
          <nav id="mobile-menu" class="mobile-menu" aria-label="Menu">
            @for (item of navItems(); track item.path) {
              <a [routerLink]="item.path" routerLinkActive="active" class="mobile-item" (click)="menuOpen.set(false)">
                <span>{{ item.label }}</span>
                @if (item.count) {
                  <span class="nav-count num">{{ item.count }}</span>
                }
              </a>
            }
            <div class="mobile-user">
              <span class="avatar" aria-hidden="true">{{ initial() }}</span>
              <span class="user-details">
                <span class="user-name">{{ authService.getUsername() }}</span>
                <span class="user-role">{{ roleLabel() }}</span>
              </span>
            </div>
          </nav>
        }
      </header>
    }

    <main [class.app-main]="authService.isLoggedIn() && !isPublicRoute()">
      <router-outlet></router-outlet>
    </main>

    @if (!authService.isLoggedIn() || isPublicRoute()) {
      <a class="help-chat" [href]="helpUrl" target="_blank" rel="noopener noreferrer"
         aria-label="Precisa de ajuda? Falar pelo WhatsApp">
        <mat-icon aria-hidden="true">chat</mat-icon>
        <span>Precisa de ajuda?</span>
      </a>
    }

    @if (showSettings) {
      <app-settings-modal (close)="showSettings = false"></app-settings-modal>
    }
  `,
  styles: [`
    .app-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--header-bg);
      color: var(--header-text);
      border-bottom: 1px solid var(--border);
    }
    .header-inner {
      display: flex;
      align-items: center;
      gap: 24px;
      height: 56px;
      padding: 0 24px;
      max-width: 1440px;
      margin: 0 auto;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-shrink: 0;
      color: var(--header-text);
      border-radius: 6px;
    }
    .brand:hover {
      text-decoration: none;
    }
    .mark {
      color: var(--primary);
      flex: none;
    }
    .mark-cut {
      fill: var(--surface);
    }
    .mark-keys {
      stroke: var(--surface);
    }
    .brand-name {
      font-size: 15px;
      font-weight: 600;
      white-space: nowrap;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 2px;
      min-width: 0;
      overflow-x: auto;
      scrollbar-width: none;
    }
    .nav-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 32px;
      padding: 0 10px;
      border-radius: var(--radius);
      color: var(--text-secondary);
      font-weight: 500;
      white-space: nowrap;
      transition: background-color 120ms var(--ease), color 120ms var(--ease);
    }
    .nav-item:hover {
      color: var(--text);
      text-decoration: none;
    }
    .nav-item.active {
      background: var(--primary-bg);
      color: var(--text);
    }
    .nav-count {
      min-width: 20px;
      height: 20px;
      padding: 0 6px;
      border-radius: 999px;
      background: #c4242a;
      color: #ffffff;
      font-size: 12px;
      line-height: 20px;
      text-align: center;
    }
    .toolbar-actions {
      display: flex;
      align-items: center;
      gap: 2px;
      margin-left: auto;
    }
    .text-action {
      height: 32px;
      display: inline-flex;
      align-items: center;
      padding: 0 10px;
      color: var(--text-secondary);
      font-weight: 500;
      border-radius: var(--radius);
    }
    .text-action:hover {
      color: var(--text);
    }
    .icon-action {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: 0;
      border-radius: var(--radius);
      background: transparent;
      color: var(--text-secondary);
      transition: background-color 120ms var(--ease), color 120ms var(--ease);
    }
    .icon-action:hover {
      background: var(--primary-bg);
      color: var(--text);
      text-decoration: none;
    }
    .icon-action mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }
    .user,
    .mobile-user {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 0 8px 0 12px;
    }
    .avatar {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #dbe7f7;
      color: #0d3a7a;
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      flex: none;
    }
    .user-details {
      display: flex;
      flex-direction: column;
      line-height: 16px;
      min-width: 0;
    }
    .user-name {
      font-weight: 500;
      white-space: nowrap;
    }
    .user-role {
      color: var(--text-secondary);
      font-size: 12px;
      white-space: nowrap;
    }
    .menu-toggle {
      display: none;
    }
    .mobile-menu {
      display: none;
    }
    .app-main {
      padding: 24px;
      max-width: 1440px;
      margin: 0 auto;
      width: 100%;
    }
    .help-chat {
      position: fixed;
      right: 24px;
      bottom: 24px;
      z-index: 1000;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      height: 44px;
      padding: 0 16px;
      border-radius: 999px;
      background: #128c4a;
      box-shadow: 0 8px 24px rgba(10, 10, 10, 0.18);
      color: #ffffff;
      font-weight: 500;
      transition: transform 120ms var(--ease), background-color 120ms var(--ease);
    }
    .help-chat mat-icon {
      width: 20px;
      height: 20px;
      font-size: 20px;
    }
    .help-chat:hover {
      background: #0e7a40;
      text-decoration: none;
    }
    .help-chat:active {
      transform: scale(0.98);
    }
    @media (max-width: 1280px) {
      .header-inner {
        gap: 16px;
        padding: 0 16px;
      }
      .user-details {
        display: none;
      }
      .user {
        padding: 0 4px 0 8px;
      }
      .app-main {
        padding: 16px;
      }
    }
    @media (max-width: 960px) {
      .nav-links,
      .user,
      .text-action {
        display: none;
      }
      .menu-toggle {
        display: inline-flex;
      }
      .header-inner {
        height: 52px;
      }
      .mobile-menu {
        display: flex;
        flex-direction: column;
        padding: 8px 16px 16px;
        border-top: 1px solid var(--border);
        background: var(--header-bg);
      }
      .mobile-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        height: 44px;
        padding: 0 12px;
        border-radius: var(--radius);
        color: var(--text);
        font-weight: 500;
      }
      .mobile-item.active {
        background: var(--primary-bg);
      }
      .mobile-item:hover {
        text-decoration: none;
      }
      .mobile-user {
        margin-top: 8px;
        padding: 12px;
        border-top: 1px solid var(--border);
      }
      .app-main {
        padding: 12px;
      }
    }
    @media (max-width: 600px) {
      .help-chat {
        right: 16px;
        bottom: 16px;
        width: 48px;
        height: 48px;
        padding: 0;
        justify-content: center;
      }
      .help-chat span {
        display: none;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'BiniTech PDV';
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  private router = inject(Router);
  private saleService = inject(SaleService);
  private snackBar = inject(MatSnackBar);
  private seoService = inject(SeoService);

  readonly helpUrl = HELP_URL;
  readonly menuOpen = signal(false);
  readonly debtorsCount = signal(0);

  showSettings = false;

  ngOnInit(): void {
    this.seoService.init();
    this.loadDebtorsCount();
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.menuOpen.set(false);
      if (this.authService.isLoggedIn()) {
        this.loadDebtorsCount();
      }
    });
  }

  navItems(): { path: string; label: string; count?: number }[] {
    if (this.authService.isSuperAdmin()) {
      return [{ path: '/admin', label: 'Lojas' }];
    }
    const items: { path: string; label: string; count?: number }[] = [
      { path: '/pdv', label: 'Frente de caixa' },
      { path: '/products', label: 'Produtos' },
      { path: '/sales-report', label: 'Relatórios' },
      { path: '/debtors', label: 'Devedores', count: this.debtorsCount() }
    ];
    if (this.authService.canManageTenantUsers()) {
      items.push({ path: '/users', label: 'Usuários' });
    }
    items.push({ path: '/billing', label: 'Assinatura' });
    return items;
  }

  initial(): string {
    return (this.authService.getUsername() ?? '?').charAt(0);
  }

  roleLabel(): string {
    const role = this.authService.getRole() ?? '';
    return ROLE_LABELS[role] ?? role;
  }

  private loadDebtorsCount(): void {
    if (!this.authService.isLoggedIn() || this.authService.isSuperAdmin()) return;
    this.saleService.listDebtors().subscribe({
      next: (debtors) => {
        this.debtorsCount.set(debtors.length);
        this.checkDailyReminder(debtors.length);
      },
      error: () => {}
    });
  }

  private checkDailyReminder(count: number): void {
    if (count === 0) return;
    const storageKey = 'pdv_debtor_reminder_date';
    const today = new Date().toISOString().split('T')[0];
    const lastReminder = localStorage.getItem(storageKey);

    if (lastReminder !== today) {
      localStorage.setItem(storageKey, today);
      this.snackBar.open(
        count === 1
          ? '1 venda no crediário aguarda cobrança.'
          : `${count} vendas no crediário aguardam cobrança.`,
        'Ver devedores',
        { duration: 8000, horizontalPosition: 'right', verticalPosition: 'top', panelClass: 'snackbar-info' }
      ).onAction().subscribe(() => {
        this.router.navigate(['/debtors']);
      });
    }
  }

  isPublicRoute(): boolean {
    const url = this.router.url.split('?')[0];
    return url === '/login' || url === '/' || url.startsWith('/signup')
      || url === '/forgot-password' || url === '/reset-password'
      || url === '/termos' || url === '/privacidade' || url === '/sobre-nos';
  }

  isLoginRoute(): boolean {
    return this.isPublicRoute();
  }

  onLogout(): void {
    this.authService.logout();
  }
}
