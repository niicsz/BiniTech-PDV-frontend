import { Injectable, inject } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs/operators';

type FbqParams = Record<string, string | number>;

interface Fbq {
  (...args: unknown[]): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  push: Fbq;
  loaded: boolean;
  version: string;
}

@Injectable({ providedIn: 'root' })
export class MetaPixelService {
  private readonly router = inject(Router);
  private pixelId = '';
  private started = false;
  private granted = false;
  private routesWatched = false;

  get configured(): boolean {
    return /^\d{5,20}$/.test(window.__env?.metaPixelId ?? '');
  }

  get active(): boolean {
    return this.started && this.granted;
  }

  start(): void {
    if (!this.configured) return;
    this.granted = true;
    if (this.started) {
      window.fbq?.('consent', 'grant');
      return;
    }
    this.pixelId = window.__env!.metaPixelId!;
    this.started = true;
    this.installStub();
    window.fbq!('consent', 'grant');
    window.fbq!('init', this.pixelId);
    window.fbq!('track', 'PageView');
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://connect.facebook.net/en_US/fbevents.js';
    document.head.appendChild(script);
    if (!this.routesWatched) {
      this.routesWatched = true;
      this.router.events
        .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
        .subscribe(() => {
          if (this.active) window.fbq?.('track', 'PageView');
        });
    }
  }

  stop(): void {
    this.granted = false;
    window.fbq?.('consent', 'revoke');
    this.clearCookies();
  }

  track(event: string, params: FbqParams = {}, eventId?: string): void {
    if (!this.active) return;
    try {
      window.fbq?.('track', event, params, eventId ? { eventID: eventId } : undefined);
    } catch {
      return;
    }
  }

  newEventId(): string {
    if (typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }

  cookie(name: '_fbp' | '_fbc'): string | undefined {
    const match = document.cookie.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${name}=`));
    if (match) return decodeURIComponent(match.slice(name.length + 1));
    if (name === '_fbc') {
      const fbclid = new URLSearchParams(window.location.search).get('fbclid');
      if (fbclid) return `fb.1.${Date.now()}.${fbclid}`;
    }
    return undefined;
  }

  private installStub(): void {
    if (window.fbq) return;
    const fbq = function (...args: unknown[]) {
      if (fbq.callMethod) {
        fbq.callMethod(...args);
      } else {
        fbq.queue.push(args);
      }
    } as Fbq;
    fbq.push = fbq;
    fbq.loaded = true;
    fbq.version = '2.0';
    fbq.queue = [];
    window.fbq = fbq;
    window._fbq = fbq;
  }

  private clearCookies(): void {
    const host = window.location.hostname;
    const domains = ['', host, `.${host}`, `.${host.replace(/^www\./, '')}`];
    ['_fbp', '_fbc'].forEach((name) =>
      domains.forEach((domain) => {
        const scope = domain ? '; domain=' + domain : '';
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${scope}`;
      }),
    );
  }
}
