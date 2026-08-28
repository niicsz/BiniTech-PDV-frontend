import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { Router, NavigationEnd, ActivatedRoute } from '@angular/router';
import { filter, map, mergeMap } from 'rxjs/operators';

export interface RouteSeo {
  title?: string;
  description?: string;
  /** When true, page should not appear in search results. */
  noindex?: boolean;
  /** Path for canonical URL (defaults to current router URL without query). */
  canonicalPath?: string;
  /** JSON-LD data specific to the current public route. */
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
}

const SITE_URL = 'https://www.binitechpdv.com.br';
const DEFAULT_TITLE = 'BiniTech PDV | Sistema de Ponto de Venda Online para Lojas';
const DEFAULT_DESCRIPTION =
  'Sistema PDV online para mercadinhos, padarias e lojas de bairro. Frente de caixa, estoque, crediário e relatórios na nuvem — sem instalar nada. Comece grátis.';
const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly router = inject(Router);
  private readonly activatedRoute = inject(ActivatedRoute);

  init(): void {
    this.applyCurrentRoute();

    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        map(() => {
          let route = this.activatedRoute;
          while (route.firstChild) {
            route = route.firstChild;
          }
          return route;
        }),
        mergeMap((route) => route.data)
      )
      .subscribe((data) => {
        const seo = (data['seo'] as RouteSeo | undefined) ?? {};
        this.apply(seo, this.router.url.split('?')[0] || '/');
      });
  }

  private applyCurrentRoute(): void {
    let route = this.activatedRoute;
    while (route.firstChild) {
      route = route.firstChild;
    }

    const seo = (route.snapshot.data['seo'] as RouteSeo | undefined) ?? {};
    this.apply(seo, this.router.url.split('?')[0] || '/');
  }

  apply(seo: RouteSeo, path: string): void {
    const pageTitle = seo.title ?? DEFAULT_TITLE;
    const description = seo.description ?? DEFAULT_DESCRIPTION;
    const canonicalPath = seo.canonicalPath ?? (path === '' ? '/' : path);
    const normalizedPath = canonicalPath.startsWith('/') ? canonicalPath : `/${canonicalPath}`;
    const canonical = `${SITE_URL}${normalizedPath}`;
    const robots = seo.noindex
      ? 'noindex, nofollow'
      : 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

    this.title.setTitle(pageTitle);

    this.updateTag('name', 'description', description);
    this.updateTag('name', 'robots', robots);
    this.updateTag('name', 'googlebot', seo.noindex ? 'noindex, nofollow' : 'index, follow');

    this.setLinkCanonical(canonical);

    this.updateTag('property', 'og:url', canonical);
    this.updateTag('property', 'og:type', 'website');
    this.updateTag('property', 'og:site_name', 'BiniTech PDV');
    this.updateTag('property', 'og:locale', 'pt_BR');
    this.updateTag('property', 'og:title', pageTitle);
    this.updateTag('property', 'og:description', description);
    this.updateTag('property', 'og:image', DEFAULT_OG_IMAGE);

    this.updateTag('name', 'twitter:card', 'summary_large_image');
    this.updateTag('name', 'twitter:title', pageTitle);
    this.updateTag('name', 'twitter:description', description);
    this.updateTag('name', 'twitter:image', DEFAULT_OG_IMAGE);

    this.setStructuredData(seo.structuredData);
  }

  private updateTag(attr: 'name' | 'property', key: string, content: string): void {
    this.meta.updateTag({ [attr]: key, content } as { name: string; content: string });
  }

  private setLinkCanonical(href: string): void {
    let link: HTMLLinkElement | null = document.querySelector('link[rel="canonical"]');
    if (!link) {
      link = document.createElement('link');
      link.setAttribute('rel', 'canonical');
      document.head.appendChild(link);
    }
    link.setAttribute('href', href);
  }

  private setStructuredData(data?: Record<string, unknown> | Array<Record<string, unknown>>): void {
    const scriptId = 'route-seo-json-ld';
    const existing = document.getElementById(scriptId);

    if (!data) {
      existing?.remove();
      return;
    }

    const script = (existing ?? document.createElement('script')) as HTMLScriptElement;
    script.id = scriptId;
    script.type = 'application/ld+json';
    script.textContent = JSON.stringify(data);
    if (!existing) {
      document.head.appendChild(script);
    }
  }
}
