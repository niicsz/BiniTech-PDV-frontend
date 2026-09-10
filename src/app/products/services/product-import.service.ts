import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export type ImportStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'COMPLETED_WITH_ERRORS' | 'FAILED' | 'CANCELLED';
export type ImportField = 'NAME' | 'BARCODE' | 'PRICE' | 'COST' | 'STOCK_QUANTITY' | 'CATEGORY' | 'ACTIVE' | 'IGNORE';
export type RowAction = 'CREATE' | 'UPDATE' | 'IGNORE' | 'ERROR';

export interface ColumnMapping { sourceColumn: string; targetField: ImportField; confidence?: number; }
export interface ImportIssue { severity: 'WARNING' | 'ERROR'; field?: string; code?: string; message: string; relatedLines?: number[]; }
export interface ImportSummary {
  totalRecords: number; validRecords: number; warningRecords: number; errorRecords: number;
  processedRecords: number; createdRecords: number; updatedRecords: number; ignoredRecords: number;
}
export interface ImportJob {
  id: string; status: ImportStatus; fileName: string; fileSize: number; headers: string[];
  suggestedMappings: ColumnMapping[]; sampleRows: Record<string, string>[]; summary: ImportSummary;
  validated: boolean; progressPercentage: number; createdAt: string; startedAt?: string;
  finishedAt?: string; failureMessage?: string;
}
export interface ImportRow {
  lineNumber: number; name?: string; barcode?: string; price?: number; cost?: number;
  stockQuantity?: number; category?: string; active?: boolean; action: RowAction;
  existingProductId?: string; currentPrice?: number; currentStockQuantity?: number; issues: ImportIssue[];
}

@Injectable({ providedIn: 'root' })
export class ProductImportService {
  private readonly baseUrl = '/api/product-imports';
  constructor(private http: HttpClient) {}
  upload(file: File): Observable<ImportJob> {
    const form = new FormData(); form.append('file', file);
    return this.http.post<ImportJob>(this.baseUrl, form, { headers: { 'Idempotency-Key': this.fileKey(file) } });
  }
  validate(id: string, mappings: ColumnMapping[], duplicateStrategy: 'ERROR' | 'FIRST' | 'LAST'): Observable<ImportJob> {
    return this.http.post<ImportJob>(`${this.baseUrl}/${id}/validate`, { mappings, duplicateStrategy });
  }
  rows(id: string, issuesOnly = false): Observable<ImportRow[]> {
    return this.http.get<ImportRow[]>(`${this.baseUrl}/${id}/rows`, { params: { page: 0, size: 200, issuesOnly } });
  }
  overrideRow(id: string, lineNumber: number, action: 'UPDATE' | 'IGNORE'): Observable<ImportRow> {
    return this.http.patch<ImportRow>(`${this.baseUrl}/${id}/rows/${lineNumber}`, { action });
  }
  start(id: string, body: object): Observable<ImportJob> { return this.http.post<ImportJob>(`${this.baseUrl}/${id}/start`, body); }
  get(id: string): Observable<ImportJob> { return this.http.get<ImportJob>(`${this.baseUrl}/${id}`); }
  cancel(id: string): Observable<void> { return this.http.delete<void>(`${this.baseUrl}/${id}`); }
  template(): Observable<Blob> { return this.http.get(`${this.baseUrl}/template`, { responseType: 'blob' }); }
  errors(id: string): Observable<Blob> { return this.http.get(`${this.baseUrl}/${id}/errors`, { responseType: 'blob' }); }
  private fileKey(file: File): string { return `web-${file.name}-${file.size}-${file.lastModified}`.slice(0, 100); }
}
