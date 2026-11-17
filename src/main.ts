import { isDevMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

if (!isDevMode()) {
  const silent = (): void => undefined;
  console.log = silent;
  console.info = silent;
  console.debug = silent;
  console.warn = silent;
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
