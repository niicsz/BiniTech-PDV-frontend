import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

type AnalyticsItem = Record<string, string | number>;
type AnalyticsParams = Record<string, string | number | boolean | AnalyticsItem[]>;
type UserProperties = Record<string, string | number>;

/**
 * Google Analytics 4 (gtag.js). Equivale ao snippet oficial, mas carregado via código porque a CSP
 * do Nginx bloqueia scripts inline. Só ativa quando `window.__env.gaMeasurementId` está preenchido.
 */
@Injectable({ providedIn: 'root' })
export class AnalyticsService {
  private router = inject(Router);
  private measurementId = '';

  init(): void {
    if (this.measurementId) return;
    const id = window.__env?.gaMeasurementId ?? '';
    if (!/^G-[A-Z0-9]+$/.test(id)) return;
    this.measurementId = id;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      // gtag.js exige o objeto `arguments`, não um array.
      // eslint-disable-next-line prefer-rest-params
      window.dataLayer!.push(arguments);
    };
    window.gtag('js', new Date());
    // page_view é enviado manualmente a cada rota, sem query string/hash (evita vazar tokens,
    // ex.: /reset-password?token=...).
    window.gtag('config', id, { send_page_view: false });

    const role = this.storageGet(localStorage, 'role');
    if (role) this.setUserProperties({ role });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
    document.head.appendChild(script);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => {
        const path = event.urlAfterRedirects.split(/[?#]/)[0];
        this.send('page_view', {
          page_path: path,
          page_location: window.location.origin + path,
          page_title: document.title
        });
      });
  }

  get enabled(): boolean {
    return !!this.measurementId;
  }

  /** Nunca envie dados pessoais (nome, e-mail, usuário, dados de clientes da loja) em `params`. */
  track(event: string, params?: AnalyticsParams): void {
    if (this.measurementId) this.send(event, params);
  }

  /**
   * Envia o evento só uma vez por loja neste navegador (marcador no localStorage). Use para
   * marcos como a primeira venda; o ID da loja fica só no navegador, nunca vai para o GA.
   */
  trackOnce(key: string, event: string, params?: AnalyticsParams): void {
    if (!this.measurementId || this.hasDone(key)) return;
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
    if (!this.measurementId) return;
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
