import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SubscriptionDTO {
  id: string;
  tenantId: string;
  asaasSubscriptionId: string | null;
  asaasCustomerId: string | null;
  planTier: string;
  billingType: string | null;
  status: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  nextBillingDate: string | null;
  lastPaymentDate: string | null;
  failedPaymentCount: number;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDTO {
  id: string;
  tenantId: string;
  subscriptionId: string;
  asaasPaymentId: string | null;
  amount: number;
  status: string;
  dueDate: string | null;
  paidAt: string | null;
  description: string;
  baseAmount: number;
  excessAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UrlDTO {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class BillingService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/billing';

  getSubscription(): Observable<SubscriptionDTO> {
    return this.http.get<SubscriptionDTO>(`${this.base}/subscription`);
  }

  getInvoices(): Observable<InvoiceDTO[]> {
    return this.http.get<InvoiceDTO[]>(`${this.base}/invoices`);
  }

  getCheckoutUrl(): Observable<UrlDTO> {
    return this.http.get<UrlDTO>(`${this.base}/checkout`);
  }

  getPixCheckoutUrl(): Observable<UrlDTO> {
    return this.http.get<UrlDTO>(`${this.base}/checkout/pix`);
  }

  getPortalUrl(): Observable<UrlDTO> {
    return this.http.get<UrlDTO>(`${this.base}/portal`);
  }
}
