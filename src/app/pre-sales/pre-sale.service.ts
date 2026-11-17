import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreatePreSaleDTO, PreSaleDTO, PreSaleStatus } from '../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class PreSaleService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/pre-sales';

  create(request: CreatePreSaleDTO): Observable<PreSaleDTO> {
    return this.http.post<PreSaleDTO>(this.baseUrl, request);
  }

  list(status?: PreSaleStatus): Observable<PreSaleDTO[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<PreSaleDTO[]>(this.baseUrl, { params });
  }

  findByNumber(number: number): Observable<PreSaleDTO> {
    return this.http.get<PreSaleDTO>(`${this.baseUrl}/number/${number}`);
  }

  cancel(id: string): Observable<PreSaleDTO> {
    return this.http.post<PreSaleDTO>(`${this.baseUrl}/${encodeURIComponent(id)}/cancel`, {});
  }
}

export function preSaleProblem(preSale: PreSaleDTO): string | null {
  if (preSale.status === 'PAID') return `A comanda #${preSale.number} já foi paga.`;
  if (preSale.status === 'CANCELLED') return `A comanda #${preSale.number} foi cancelada.`;
  return null;
}
