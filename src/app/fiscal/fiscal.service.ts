import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type TaxRegime = 'SIMPLES_NACIONAL' | 'MEI';

export interface FiscalAddress {
  logradouro: string;
  numero: string | null;
  complemento: string | null;
  bairro: string;
  codigoMunicipio: string;
  cidade: string;
  uf: string;
  cep: string;
}

export interface FiscalIssuer {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string | null;
  inscricaoEstadual: string;
  regime: TaxRegime;
  address: FiscalAddress;
  telefone: string | null;
  email: string | null;
  serie: number;
  environment: number;
  defaultNcm: string | null;
  defaultCfop: string | null;
  defaultCsosn: string | null;
  autoIssue: boolean;
  contingencyEnabled: boolean;
  certificateHolder: string | null;
  certificateValidUntil: string | null;
  readyToIssue: boolean;
}

export type FiscalIssuerRequest = Omit<
  FiscalIssuer,
  'environment' | 'certificateHolder' | 'certificateValidUntil' | 'readyToIssue'
>;

export type NfceStatus =
  | 'AWAITING_REQUEST'
  | 'PENDING'
  | 'CONTINGENCY'
  | 'AUTHORIZED'
  | 'REJECTED'
  | 'DENIED'
  | 'CANCELLED'
  | 'VOIDED';

export interface NfceDocument {
  saleId: string;
  status: NfceStatus;
  environment: number;
  serie: number | null;
  numero: number | null;
  chave: string | null;
  protocolo: string | null;
  cStat: string | null;
  xMotivo: string | null;
  lastError: string | null;
  qrCode: string | null;
  urlChave: string | null;
  total: number | null;
  consumerCpf: string | null;
  contingency: boolean;
  authorizedAt: string | null;
  cancelledAt: string | null;
}

export interface SefazStatus {
  kind: string;
  cStat: string;
  xMotivo: string;
}

export function canPrintNfce(document: NfceDocument | null): boolean {
  return !!document && (document.status === 'AUTHORIZED' || document.status === 'CONTINGENCY');
}

export function isNfceInProgress(document: NfceDocument | null): boolean {
  return !document || document.status === 'PENDING';
}

@Injectable({ providedIn: 'root' })
export class FiscalService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/fiscal';

  getIssuer(): Observable<FiscalIssuer | null> {
    return this.http.get<FiscalIssuer | null>(`${this.base}/issuer`);
  }

  saveIssuer(issuer: FiscalIssuerRequest): Observable<FiscalIssuer> {
    return this.http.put<FiscalIssuer>(`${this.base}/issuer`, issuer);
  }

  uploadCertificate(file: File, password: string): Observable<FiscalIssuer> {
    const form = new FormData();
    form.append('file', file);
    form.append('password', password);
    return this.http.post<FiscalIssuer>(`${this.base}/issuer/certificate`, form);
  }

  sefazStatus(): Observable<SefazStatus> {
    return this.http.get<SefazStatus>(`${this.base}/issuer/sefaz-status`);
  }

  lookupCep(cep: string): Observable<FiscalAddress> {
    return this.http.get<FiscalAddress>(`${this.base}/cep/${cep}`);
  }

  getNfce(saleId: string): Observable<NfceDocument | null> {
    return this.http.get<NfceDocument | null>(`${this.base}/nfce/${saleId}`);
  }

  issueNfce(saleId: string, consumerCpf: string | null): Observable<NfceDocument> {
    return this.http.post<NfceDocument>(`${this.base}/nfce/${saleId}/issue`, { consumerCpf });
  }

  cancelNfce(saleId: string, reason: string): Observable<NfceDocument> {
    return this.http.post<NfceDocument>(`${this.base}/nfce/${saleId}/cancel`, { reason });
  }

  downloadDanfe(saleId: string): Observable<Blob> {
    return this.http.get(`${this.base}/nfce/${saleId}/danfe`, { responseType: 'blob' });
  }
}
