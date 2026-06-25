import { HttpInterceptorFn } from '@angular/common/http';

export const apiBaseInterceptor: HttpInterceptorFn = (req, next) => {
  const apiBase = window.__env?.apiBase ?? '';

  if (apiBase && req.url.startsWith('/api')) {
    const base = apiBase.replace(/\/$/, '');
    return next(req.clone({ url: base + req.url }));
  }

  return next(req);
};
