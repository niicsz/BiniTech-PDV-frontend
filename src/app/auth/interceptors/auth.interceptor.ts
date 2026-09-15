import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AuthResponse } from '../../shared/models/api.models';
import { SessionRefreshCoordinator } from './session-refresh';

const sessionRefresh = new SessionRefreshCoordinator<AuthResponse>();

export const authInterceptor: HttpInterceptorFn = (req: HttpRequest<any>, next: HttpHandlerFn) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (req.url.includes('/api/auth/login') || req.url.includes('/api/auth/refresh')) {
    return next(req);
  }

  const token = authService.getToken();
  let authReq = req;

  if (token) {
    authReq = req.clone({
      setHeaders: { Authorization: `Bearer ${token}` }
    });
  } else {
    console.warn('[AuthInterceptor] Requisição sem token para:', req.url);
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && token && !req.url.includes('/api/auth/logout')) {
        console.warn('[AuthInterceptor] Recebido 401, tentando renovar token para:', req.url);
        return sessionRefresh.refresh(
          () => authService.refreshToken(),
          () => authService.logout()
        ).pipe(
          switchMap(res => {
            console.info('[AuthInterceptor] Token renovado, reenviando requisição:', req.url);
            const newReq = req.clone({
              setHeaders: { Authorization: `Bearer ${res.accessToken}` }
            });
            return next(newReq);
          })
        );
      }
      if (error.status === 402) {
        console.warn('[AuthInterceptor] Recebido 402 (pagamento pendente), redirecionando para /billing');
        router.navigate(['/billing']);
        return throwError(() => error);
      }
      if (error.status >= 500) {
        console.error('[AuthInterceptor] Erro do servidor:', error.status, req.url, error.message);
      } else if (error.status >= 400) {
        console.warn('[AuthInterceptor] Erro do cliente:', error.status, req.url, error.error?.message);
      }
      return throwError(() => error);
    })
  );
};
