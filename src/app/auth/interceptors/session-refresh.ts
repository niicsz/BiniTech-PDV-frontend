import { Observable, catchError, defer, finalize, shareReplay, throwError } from 'rxjs';

export class SessionRefreshCoordinator<T> {
  private inFlight?: Observable<T>;

  refresh(request: () => Observable<T>, onSessionRejected: () => void): Observable<T> {
    if (!this.inFlight) {
      this.inFlight = defer(request).pipe(
        catchError(error => {
          if (error?.status === 401 || error?.status === 403) onSessionRejected();
          return throwError(() => error);
        }),
        finalize(() => { this.inFlight = undefined; }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.inFlight;
  }
}
