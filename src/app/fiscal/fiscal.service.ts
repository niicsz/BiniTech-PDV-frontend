import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface FiscalProfile {
  cnpj: string;
  razaoSocial: string;
  inscricaoEstadual: string;
  regimeTributario: string;
  codigoMunicipio: string;
  email: string | null;
  telefone: string | null;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  serieNfce: number;
  cscId: string | null;
  cscConfigured: boolean;
  defaultNcm: string | null;
  defaultCfop: string | null;
  defaultCsosn: string | null;
  autoIssue: boolean;
  certificateValidUntil: string | null;
  environment: number;
  readyToIssue: boolean;
}

export interface FiscalProfileRequest extends Omit<FiscalProfile, 'cscConfigured' | 'certificateValidUntil' | 'environment' | 'readyToIssue'> {
  cscToken: string | null;
}

export type NfceStatus = 'QUEUED' | 'PROCESSING' | 'ISSUED' | 'ERROR' | 'CANCELLING' | 'CANCELLED';

export interface NfceDocument {
  saleId: string;
  status: NfceStatus;
  numero: number | null;
  serie: number | null;
  chaveAcesso: string | null;
  protocolo: string | null;
  codigoStatus: number | null;
  motivo: string | null;
  qrCode: string | null;
  urlChave: string | null;
  valorTotal: number | null;
  consumerCpf: string | null;
  environment: number;
  issuedAt: string | null;
  cancelledAt: string | null;
}

export interface CepAddress {
  cep: string;
  logradouro: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  codigoMunicipio: string | null;
}

@Injectable({ providedIn: 'root' })
export class FiscalService {
  private readonly http = inject(HttpClient);

  getProfile(): Observable<FiscalProfile | null> {
    return this.http.get<FiscalProfile | null>('/api/fiscal/profile');
  }

  saveProfile(profile: FiscalProfileRequest): Observable<FiscalProfile> {
    return this.http.put<FiscalProfile>('/api/fiscal/profile', profile);
  }

  uploadCertificate(file: File, password: string): Observable<FiscalProfile> {
    const form = new FormData();
    form.append('file', file);
    form.append('password', password);
    return this.http.post<FiscalProfile>('/api/fiscal/certificate', form);
  }

  issueNfce(saleId: string, consumerCpf: string | null): Observable<NfceDocument> {
    return this.http.post<NfceDocument>(`/api/sales/${saleId}/nfce`, { consumerCpf });
  }

  getNfce(saleId: string): Observable<NfceDocument | null> {
    return this.http.get<NfceDocument | null>(`/api/sales/${saleId}/nfce`);
  }

  cancelNfce(saleId: string, reason: string): Observable<NfceDocument> {
    return this.http.post<NfceDocument>(`/api/sales/${saleId}/nfce/cancel`, { reason });
  }

  downloadDanfe(saleId: string): Observable<Blob> {
    return this.http.get(`/api/sales/${saleId}/nfce/danfe`, { responseType: 'blob' });
  }

  lookupCep(cep: string): Observable<CepAddress> {
    return this.http.get<CepAddress>(`/api/fiscal/cep/${cep}`);
  }
}
