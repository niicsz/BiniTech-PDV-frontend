import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject, tap } from 'rxjs';
import { SaleDTO, CreateSaleDTO, CreateSaleReturnDTO } from '../../shared/models/api.models';

@Injectable({ providedIn: 'root' })
export class SaleService {

  private readonly baseUrl = '/api/sales';

  readonly debtsChanged = new Subject<void>();

  constructor(private http: HttpClient) {}

  create(sale: CreateSaleDTO): Observable<SaleDTO> {
    console.info('[SaleService] Criando venda com', sale.items?.length ?? 0, 'item(ns)');
    return this.http.post<SaleDTO>(this.baseUrl, sale).pipe(
      tap(created => {
        console.info('[SaleService] Venda criada com sucesso:', created.id, 'total:', created.totalAmount);
        if (created.payments?.some(p => p.method === 'CREDIARIO')) this.debtsChanged.next();
      })
    );
  }

  getById(id: string): Observable<SaleDTO> {
    console.info('[SaleService] Buscando venda por id:', id);
    return this.http.get<SaleDTO>(`${this.baseUrl}/${id}`);
  }

  listByDay(date: string): Observable<SaleDTO[]> {
    console.info('[SaleService] Listando vendas por dia:', date);
    const params = new HttpParams().set('date', date);
    return this.http.get<SaleDTO[]>(this.baseUrl, { params }).pipe(
      tap(sales => console.info('[SaleService] Vendas por dia carregadas:', sales.length))
    );
  }

  listByPeriod(startDate: string, endDate: string): Observable<SaleDTO[]> {
    console.info('[SaleService] Listando vendas por período:', startDate, 'a', endDate);
    const params = new HttpParams()
      .set('startDate', startDate)
      .set('endDate', endDate);
    return this.http.get<SaleDTO[]>(this.baseUrl, { params }).pipe(
      tap(sales => console.info('[SaleService] Vendas por período carregadas:', sales.length))
    );
  }

  listAll(): Observable<SaleDTO[]> {
    console.info('[SaleService] Listando todas as vendas');
    return this.http.get<SaleDTO[]>(this.baseUrl).pipe(
      tap(sales => console.info('[SaleService] Todas as vendas carregadas:', sales.length))
    );
  }

  listDebtors(): Observable<SaleDTO[]> {
    console.info('[SaleService] Listando devedores');
    return this.http.get<SaleDTO[]>(`${this.baseUrl}/debtors`).pipe(
      tap(debtors => console.info('[SaleService] Devedores carregados:', debtors.length))
    );
  }

  registerReturn(id: string, request: CreateSaleReturnDTO): Observable<SaleDTO> {
    console.info('[SaleService] Registrando devolução da venda:', id);
    return this.http.post<SaleDTO>(`${this.baseUrl}/${id}/returns`, request).pipe(
      tap(updated => {
        if (updated.payments?.some(p => p.method === 'CREDIARIO')) this.debtsChanged.next();
      })
    );
  }

  markAsPaid(id: string): Observable<SaleDTO> {
    console.info('[SaleService] Marcando venda como paga:', id);
    return this.http.patch<SaleDTO>(`${this.baseUrl}/${id}/mark-paid`, {}).pipe(
      tap(() => {
        console.info('[SaleService] Venda marcada como paga com sucesso:', id);
        this.debtsChanged.next();
      })
    );
  }
}
