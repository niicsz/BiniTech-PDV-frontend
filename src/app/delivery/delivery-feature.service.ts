import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, Subscription, catchError, finalize, interval, map, of, shareReplay, startWith, switchMap, tap } from 'rxjs';
import { DeliveryService, DeliverySettings } from './delivery.service';

@Injectable({ providedIn: 'root' })
export class DeliveryFeatureService {
  private readonly deliveryService = inject(DeliveryService);
  private readonly settings = signal<DeliverySettings | null>(null);
  private readonly available = signal(false);
  private pending: Observable<boolean> | null = null;
  private loaded = false;
  private polling: Subscription | null = null;

  readonly featureAvailable = this.available.asReadonly();
  readonly enabled = computed(() => !!this.settings()?.enabled);
  readonly newOrders = signal(0);

  ensureLoaded(): Observable<boolean> {
    if (this.loaded) return of(this.available());
    if (!this.pending) {
      this.pending = this.deliveryService.getSettings().pipe(
        tap((settings) => {
          this.settings.set(settings);
          this.available.set(true);
          this.loaded = true;
          this.startPolling();
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

  update(settings: DeliverySettings): void {
    this.settings.set(settings);
    this.startPolling();
  }

  refreshNewOrders(): void {
    if (!this.enabled()) return;
    this.deliveryService.listOrders('RECEIVED').subscribe({
      next: (orders) => this.newOrders.set(orders.length),
      error: () => {},
    });
  }

  reset(): void {
    this.polling?.unsubscribe();
    this.polling = null;
    this.settings.set(null);
    this.available.set(false);
    this.newOrders.set(0);
    this.loaded = false;
    this.pending = null;
  }

  private startPolling(): void {
    if (this.polling || !this.enabled()) return;
    this.polling = interval(30000)
      .pipe(
        startWith(0),
        switchMap(() => this.deliveryService.listOrders('RECEIVED').pipe(catchError(() => of(null)))),
      )
      .subscribe((orders) => {
        if (orders) this.newOrders.set(orders.length);
      });
  }
}
