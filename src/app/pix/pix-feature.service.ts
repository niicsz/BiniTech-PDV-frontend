import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay, tap } from 'rxjs';
import { PixService, PixSettings } from './pix.service';

@Injectable({ providedIn: 'root' })
export class PixFeatureService {
  private readonly pixService = inject(PixService);
  private readonly settingsState = signal<PixSettings | null>(null);
  private readonly available = signal(false);
  private pending: Observable<boolean> | null = null;
  private loaded = false;

  readonly featureAvailable = this.available.asReadonly();
  readonly settings = this.settingsState.asReadonly();
  readonly active = computed(() => {
    const settings = this.settingsState();
    return !!settings && settings.enabled && settings.configured;
  });

  ensureLoaded(force = false): Observable<boolean> {
    if (this.loaded && !force) return of(this.available());
    if (!this.pending) {
      this.pending = this.pixService.getSettings().pipe(
        tap((settings) => {
          this.settingsState.set(settings);
          this.available.set(true);
          this.loaded = true;
        }),
        map(() => true),
        catchError((error) => {
          if (error?.status === 404) {
            this.available.set(false);
            this.loaded = true;
          }
          return of(false);
        }),
        finalize(() => (this.pending = null)),
        shareReplay(1),
      );
    }
    return this.pending;
  }

  update(settings: PixSettings): void {
    this.settingsState.set(settings);
  }

  reset(): void {
    this.settingsState.set(null);
    this.available.set(false);
    this.loaded = false;
  }
}
