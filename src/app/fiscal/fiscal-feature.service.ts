import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, shareReplay, tap } from 'rxjs';
import { FiscalPreferences, FiscalService } from './fiscal.service';

@Injectable({ providedIn: 'root' })
export class FiscalFeatureService {
  private readonly fiscalService = inject(FiscalService);
  private readonly state = signal<FiscalPreferences | null>(null);
  private pending: Observable<boolean> | null = null;

  readonly loaded = computed(() => this.state() !== null);
  readonly enabled = computed(() => !!this.state()?.nfceEnabled);
  readonly needsDecision = computed(() => this.state()?.decided === false);

  ensureLoaded(): Observable<boolean> {
    const current = this.state();
    if (current) {
      return of(current.nfceEnabled);
    }
    if (!this.pending) {
      this.pending = this.fiscalService.getPreferences().pipe(
        catchError(() => of({ decided: true, nfceEnabled: false, decidedAt: null })),
        tap((preferences) => {
          this.state.set(preferences);
          this.pending = null;
        }),
        map((preferences) => preferences.nfceEnabled),
        shareReplay(1),
      );
    }
    return this.pending;
  }

  decide(nfceEnabled: boolean): Observable<FiscalPreferences> {
    return this.fiscalService
      .updatePreferences(nfceEnabled)
      .pipe(tap((preferences) => this.state.set(preferences)));
  }

  reset(): void {
    this.state.set(null);
    this.pending = null;
  }
}
