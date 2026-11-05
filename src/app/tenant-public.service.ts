import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateTenantRequest {
  name: string;
  planId: string;
  billingEmail: string;
  acceptedTerms: boolean;
  termsVersion: string;
  password?: string;
  phone?: string;
  website?: string;
}

export interface SignupResponse {
  id: string;
  name: string;
  slug: string;
  status: string;
  planId: string;
  active: boolean;
  username: string | null;
  trialEndsAt: string | null;
}

export interface TenantDTO {
  id: string;
  name: string;
  slug: string;
  status: string;
  planId: string;
  billingEmail: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class TenantPublicService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/public/tenants';

  createTenant(payload: CreateTenantRequest): Observable<TenantDTO> {
    return this.http.post<TenantDTO>(this.baseUrl, payload);
  }

  signUp(payload: CreateTenantRequest): Observable<SignupResponse> {
    return this.http.post<SignupResponse>(this.baseUrl, payload);
  }
}
