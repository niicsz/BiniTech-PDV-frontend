import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { CashMovementType, CashSessionDTO } from '../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class CashSessionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/cash-sessions';

  current(): Observable<CashSessionDTO | null> {
    return this.http
      .get<CashSessionDTO | null>(`${this.baseUrl}/current`, { observe: 'response' })
      .pipe(map((response) => (response.status === 204 ? null : response.body)));
  }

  open(openingAmount: number): Observable<CashSessionDTO> {
    return this.http.post<CashSessionDTO>(this.baseUrl, { openingAmount });
  }

  addMovement(id: string, type: CashMovementType, amount: number, reason?: string): Observable<CashSessionDTO> {
    return this.http.post<CashSessionDTO>(`${this.baseUrl}/${id}/movements`, { type, amount, reason: reason || undefined });
  }

  close(id: string, countedAmount: number | null, notes?: string): Observable<CashSessionDTO> {
    return this.http.post<CashSessionDTO>(`${this.baseUrl}/${id}/close`, {
      countedAmount: countedAmount ?? undefined,
      notes: notes || undefined,
    });
  }

  get(id: string): Observable<CashSessionDTO> {
    return this.http.get<CashSessionDTO>(`${this.baseUrl}/${id}`);
  }

  list(startDate: string, endDate: string): Observable<CashSessionDTO[]> {
    const params = new HttpParams().set('startDate', startDate).set('endDate', endDate);
    return this.http.get<CashSessionDTO[]>(this.baseUrl, { params });
  }
}
