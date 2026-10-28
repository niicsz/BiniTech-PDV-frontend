import { ApplicationConfig, DEFAULT_CURRENCY_CODE, LOCALE_ID, provideZoneChangeDetection } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localePt from '@angular/common/locales/pt';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { routes } from './app.routes';
import { apiBaseInterceptor } from './core/api-base.interceptor';
import { authInterceptor } from './auth/interceptors/auth.interceptor';

registerLocaleData(localePt, 'pt-BR');

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideAnimationsAsync(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([apiBaseInterceptor, authInterceptor])),
    { provide: LOCALE_ID, useValue: 'pt-BR' },
    { provide: DEFAULT_CURRENCY_CODE, useValue: 'BRL' }
  ]
};
