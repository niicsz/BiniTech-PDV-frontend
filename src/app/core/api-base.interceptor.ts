import { HttpInterceptorFn } from '@angular/common/http';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = window.__env?.apiBase ?? '';
  const importApiBase = window.__env?.importApiBase ?? '';
  const fiscalApiBase = window.__env?.fiscalApiBase ?? '';

  if (importApiBase && req.url.startsWith('/api/product-imports')) {
    const base = importApiBase.replace(/\/$/, '');
    return next(req.clone({ url: base + req.url }));
  }
  if (fiscalApiBase && req.url.startsWith('/api/fiscal')) {
    const base = fiscalApiBase.replace(/\/$/, '');
    return next(req.clone({ url: base + req.url }));
  }
  if (apiBase && req.url.startsWith('/api')) {
    const base = apiBase.replace(/\/$/, '');
    return next(req.clone({ url: base + req.url }));
  }

  return next(req);
};
