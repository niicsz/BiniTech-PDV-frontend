import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { CreateSaleDTO, SaleDTO } from '../shared/models/api.models';

export interface PixSettings {
  provider: string;
  enabled: boolean;
  configured: boolean;
  accountName?: string | null;
  accessTokenHint?: string | null;
  webhookSecretConfigured: boolean;
  updatedAt?: string | null;
}

export interface UpdatePixSettings {
  enabled?: boolean;
  accessToken?: string;
  webhookSecret?: string;
}

export type PixChargeStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'EXPIRED' | 'CANCELLED';

export interface PixCharge {
  id: string;
  status: PixChargeStatus;
  amount: number;
  qrCode?: string | null;
  qrCodeBase64?: string | null;
  createdAt?: string;
  expiresAt?: string;
  paidAt?: string | null;
  saleId?: string | null;
  sale?: SaleDTO | null;
  failureReason?: string | null;
}

@Injectable({ providedIn: 'root' })
export class PixService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/pix';

  getSettings(): Observable<PixSettings> {
    return this.http.get<PixSettings>(`${this.baseUrl}/settings`);
  }

  updateSettings(update: UpdatePixSettings): Observable<PixSettings> {
    return this.http.put<PixSettings>(`${this.baseUrl}/settings`, update);
  }

  createCharge(sale: CreateSaleDTO): Observable<PixCharge> {
    return this.http.post<PixCharge>(`${this.baseUrl}/charges`, sale);
  }

  getCharge(id: string): Observable<PixCharge> {
    return this.http.get<PixCharge>(`${this.baseUrl}/charges/${encodeURIComponent(id)}`);
  }

  cancelCharge(id: string): Observable<PixCharge> {
    return this.http.post<PixCharge>(`${this.baseUrl}/charges/${encodeURIComponent(id)}/cancel`, {});
  }
}
