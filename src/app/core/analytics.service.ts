import { Injectable, inject, signal } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

type AnalyticsItem = Record<string, string | number>;
type AnalyticsParams = Record<string, string | number | boolean | AnalyticsItem[]>;
type UserProperties = Record<string, string | number>;
export type AnalyticsConsent = 'granted' | 'denied';

const CONSENT_KEY = 'analytics_consent';

/**
 * Google Analytics 4 (gtag.js). Equivale ao snippet oficial, mas carregado via código porque a CSP
 * do Nginx bloqueia scripts inline. Só ativa quando `window.__env.gaMeasurementId` está preenchido.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private router = inject(Router);
  private measurementId = '';
  private started = false;

  readonly consent = signal<AnalyticsConsent | null>(null);

  init(): void {
    if (this.measurementId) return;
    const id = window.__env?.gaMeasurementId ?? '';
    if (!/^G-[A-Z0-9]+$/.test(id)) return;
    this.measurementId = id;

    const stored = this.storageGet(localStorage, CONSENT_KEY);
    this.consent.set(stored === 'granted' || stored === 'denied' ? stored : null);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.sendPageView(event.urlAfterRedirects));

    if (this.consent() === 'granted') this.start(false);
  }

  get consentPending(): boolean {
    return !!this.measurementId && this.consent() === null;
  }

  setConsent(choice: AnalyticsConsent): void {
    if (!this.measurementId) return;
    this.storageSet(localStorage, CONSENT_KEY, choice);
    this.consent.set(choice);
    if (choice === 'granted') {
      this.start(true);
      return;
    }
    if (this.started) {
      (window as unknown as Record<string, unknown>)[`ga-disable-${this.measurementId}`] = true;
      window.gtag?.('consent', 'update', { analytics_storage: 'denied' });
    }
    this.clearGaCookies();
  }

  reopenConsent(): void {
    if (!this.measurementId) return;
    this.storageSet(localStorage, CONSENT_KEY, null);
    this.consent.set(null);
  }

  private start(sendCurrentPage: boolean): void {
    const id = this.measurementId;
    (window as unknown as Record<string, unknown>)[`ga-disable-${id}`] = false;
    if (this.started) {
      window.gtag?.('consent', 'update', { analytics_storage: 'granted' });
      return;
    }
    this.started = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js exige o objeto `arguments`, não um array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('consent', 'default', {
      analytics_storage: 'granted',
      ad_storage: 'denied',
      ad_user_data: 'denied',
      ad_personalization: 'denied'
    });
    window.gtag('js', new Date());
    window.gtag('set', {
      page_location: window.location.origin + window.location.pathname,
      page_referrer: this.cleanReferrer()
    });
    window.gtag('config', id, {
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    const role = this.storageGet(localStorage, 'role');
    if (role) this.setUserProperties({ role });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);

    if (sendCurrentPage) this.sendPageView(this.router.url);
  }

  private sendPageView(url: string): void {
    if (!this.started || this.consent() !== 'granted') return;
    const path = this.cleanPath(url);
    const pageLocation = window.location.origin + path;
    try {
      window.gtag?.('set', { page_location: pageLocation });
      window.gtag?.('event', 'page_view', { page_path: path, page_location: pageLocation, page_title: document.title });
    } catch {
      return;
    }
  }

  private cleanPath(url: string): string {
    return url.split(/[?#]/)[0] || '/';
  }

  private cleanReferrer(): string {
    try {
      return document.referrer ? new URL(document.referrer).origin + '/' : '';
    } catch {
      return '';
    }
  }

  private clearGaCookies(): void {
    const host = window.location.hostname;
    const domains = ['', host, `.${host}`, `.${host.replace(/^www\./, '')}`];
    document.cookie.split(';')
      .map(cookie => cookie.split('=')[0].trim())
      .filter(name => name === '_ga' || name.startsWith('_ga_') || name.startsWith('_gid'))
      .forEach(name => domains.forEach(domain => {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${domain ? `; domain=${domain}` : ''}`;
      }));
  }

  get enabled(): boolean {
    return this.started && this.consent() === 'granted';
  }

  /** Nunca envie dados pessoais (nome, e-mail, usuário, dados de clientes da loja) em `params`. */
  track(event: string, params?: AnalyticsParams): void {
    if (this.enabled) this.send(event, params);
  }

  /**
   * Envia o evento só uma vez por loja neste navegador (marcador no localStorage). Use para
   * marcos como a primeira venda; o ID da loja fica só no navegador, nunca vai para o GA.
   */
  trackOnce(key: string, event: string, params?: AnalyticsParams): void {
    if (!this.enabled || this.hasDone(key)) return;
    this.markDone(key);
    this.send(event, params);
  }

  hasDone(key: string): boolean {
    return this.storageGet(localStorage, this.onceKey(key)) === '1';
  }

  markDone(key: string): void {
    this.storageSet(localStorage, this.onceKey(key), '1');
  }

  /** Propriedades categóricas do usuário (ex.: plano, perfil). Nada que identifique a pessoa. */
  setUserProperties(properties: UserProperties): void {
    if (!this.started) return;
    try {
      window.gtag?.('set', 'user_properties', properties);
    } catch {
      // Analytics nunca deve quebrar a aplicação.
    }
  }

  /** Estado local do analytics por loja (ex.: último plano visto), para detectar mudanças. */
  getState(key: string): string | null {
    return this.storageGet(localStorage, this.onceKey(key));
  }

  setState(key: string, value: string): void {
    this.storageSet(localStorage, this.onceKey(key), value);
  }

  getSession(key: string): string | null {
    return this.storageGet(sessionStorage, `ga_${key}`);
  }

  setSession(key: string, value: string | null): void {
    this.storageSet(sessionStorage, `ga_${key}`, value);
  }

  private onceKey(key: string): string {
    return `ga_${this.storageGet(localStorage, 'tenantId') ?? 'anon'}_${key}`;
  }

  private storageGet(storage: Storage, key: string): string | null {
    try {
      return storage.getItem(key);
    } catch {
      return null;
    }
  }

  private storageSet(storage: Storage, key: string, value: string | null): void {
    try {
      if (value === null) storage.removeItem(key);
      else storage.setItem(key, value);
    } catch {
      // Sem storage (aba anônima/bloqueio): o evento apenas pode se repetir.
    }
  }

  private send(event: string, params?: AnalyticsParams): void {
    try {
      window.gtag?.('event', event, params);
    } catch {
      // Analytics nunca deve quebrar a aplicação.
    }
  }
}
