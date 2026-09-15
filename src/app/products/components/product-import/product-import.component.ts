import { CommonModule } from '@angular/common';
import { Component, OnDestroy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { Subscription, timer, switchMap, takeWhile } from 'rxjs';
import { ColumnMapping, ImportField, ImportJob, ImportRow, ProductImportService } from '../../services/product-import.service';

@Component({
  selector: 'app-product-import',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MatButtonModule, MatCheckboxModule, MatIconModule, MatProgressBarModule, MatRadioModule, MatSelectModule],
  templateUrl: './product-import.component.html',
  styleUrls: ['./product-import.component.scss']
})
export class ProductImportComponent implements OnDestroy {
  readonly steps = ['Arquivo', 'Mapeamento', 'Validação', 'Revisão', 'Importação', 'Resultado'];
  readonly fields: { value: ImportField; label: string }[] = [
    { value: 'NAME', label: 'Nome' }, { value: 'BARCODE', label: 'Código de barras' },
    { value: 'PRICE', label: 'Preço' }, { value: 'COST', label: 'Custo' },
    { value: 'STOCK_QUANTITY', label: 'Estoque' }, { value: 'CATEGORY', label: 'Categoria' },
    { value: 'ACTIVE', label: 'Status/ativo' }, { value: 'IGNORE', label: 'Ignorar coluna' }
  ];
  readonly updateOptions = [
    { value: 'NAME', label: 'Nome' }, { value: 'PRICE', label: 'Preço' },
    { value: 'COST', label: 'Custo' }, { value: 'CATEGORY', label: 'Categoria' },
    { value: 'ACTIVE', label: 'Status' }
  ];
  step = 0; job?: ImportJob; rows: ImportRow[] = []; selectedFile?: File; mappings: ColumnMapping[] = [];
  duplicateStrategy: 'ERROR' | 'FIRST' | 'LAST' = 'ERROR'; mode: 'CREATE_ONLY' | 'CREATE_AND_UPDATE' = 'CREATE_ONLY';
  stockMode: 'IGNORE' | 'REPLACE' | 'INCREMENT' = 'IGNORE'; updateFields = new Set<string>(['NAME', 'PRICE', 'COST', 'CATEGORY', 'ACTIVE']);
  busy = false; updatingLine?: number; error = ''; private polling?: Subscription;
  pageIndex = 0; pageSize = 25; loadingRows = false; rowsLoaded = false;
  private rowsRequest?: Subscription;
  get totalPages(): number { return Math.max(1, Math.ceil((this.job?.summary.totalRecords ?? 0) / this.pageSize)); }
  get firstVisible(): number { return this.rows.length ? this.pageIndex * this.pageSize + 1 : 0; }
  get lastVisible(): number { return this.rows.length ? this.pageIndex * this.pageSize + this.rows.length : 0; }
  constructor(private imports: ProductImportService) {}
  ngOnDestroy(): void { this.polling?.unsubscribe(); this.rowsRequest?.unsubscribe(); }
  chooseFile(event: Event): void { this.selectedFile = (event.target as HTMLInputElement).files?.[0]; this.error = ''; }
  upload(): void {
    if (!this.selectedFile) return;
    this.run(this.imports.upload(this.selectedFile), job => this.resume(job));
  }
  validate(): void {
    if (!this.job) return;
    this.run(this.imports.validate(this.job.id, this.mappings, this.duplicateStrategy), job => {
      this.job = job; this.loadRows(0); this.step = 2;
    });
  }
  review(): void { this.step = 3; }
  changePageSize(value: number): void { this.pageSize = Number(value); this.loadRows(0); }
  loadRows(page: number): void {
    if (!this.job || this.updatingLine != null) return;
    this.rowsRequest?.unsubscribe();
    this.pageIndex = Math.max(0, Math.min(page, this.totalPages - 1));
    this.loadingRows = true; this.rowsLoaded = false; this.rows = []; this.error = '';
    this.rowsRequest = this.imports.rows(this.job.id, false, this.pageIndex, this.pageSize).subscribe({
      next: rows => { this.rows = rows; this.loadingRows = false; this.rowsLoaded = true; },
      error: err => { this.loadingRows = false; this.error = err.error?.message || 'Não foi possível carregar esta página. Tente novamente.'; }
    });
  }
  start(): void {
    if (!this.job) return;
    const stockChanges = this.stockMode !== 'IGNORE';
    if (stockChanges && !window.confirm(`Atenção: o estoque será alterado conforme a opção escolhida. Essa operação ficará registrada. Deseja continuar?`)) return;
    const body = { mode: this.mode, stockMode: this.stockMode, updateFields: [...this.updateFields], confirmStockChange: stockChanges };
    this.run(this.imports.start(this.job.id, body), job => { this.job = job; this.step = 4; this.poll(); });
  }
  toggleField(field: string, checked: boolean): void { checked ? this.updateFields.add(field) : this.updateFields.delete(field); }
  setExistingAction(row: ImportRow, action: 'UPDATE' | 'IGNORE'): void {
    if (!this.job || this.updatingLine != null) return;
    this.updatingLine = row.lineNumber; this.error = '';
    this.imports.overrideRow(this.job.id, row.lineNumber, action).subscribe({
      next: updated => {
        Object.assign(row, updated);
        if (action === 'UPDATE') this.mode = 'CREATE_AND_UPDATE';
        this.updatingLine = undefined;
      },
      error: err => {
        this.error = err.error?.message || 'Não foi possível salvar a decisão desta linha.';
        this.updatingLine = undefined;
      }
    });
  }
  downloadTemplate(): void { this.imports.template().subscribe(blob => this.download(blob, 'modelo-importacao-produtos.csv')); }
  downloadErrors(): void { if (this.job) this.imports.errors(this.job.id).subscribe(blob => this.download(blob, `erros-importacao-${this.job!.id}.csv`)); }
  nextFromValidation(): void { this.review(); }
  private resume(job: ImportJob): void {
    this.job = job;
    this.mappings = job.suggestedMappings;
    if (job.status === 'PROCESSING') {
      this.step = 4;
      this.poll();
      return;
    }
    if (!['PENDING', 'PROCESSING'].includes(job.status)) {
      this.step = 5;
      return;
    }
    if (job.validated) {
      this.loadRows(0);
      this.step = 2;
      return;
    }
    this.step = 1;
  }
  private poll(): void {
    if (!this.job) return;
    this.polling = timer(0, 1200).pipe(switchMap(() => this.imports.get(this.job!.id)),
      takeWhile(job => ['PENDING', 'PROCESSING'].includes(job.status), true)).subscribe(job => {
        this.job = job;
        if (!['PENDING', 'PROCESSING'].includes(job.status)) this.step = 5;
      });
  }
  private run(request: import('rxjs').Observable<ImportJob>, done: (job: ImportJob) => void): void {
    this.busy = true; this.error = '';
    request.subscribe({ next: job => { this.busy = false; done(job); }, error: err => { this.busy = false; this.error = err.error?.message || 'Não foi possível concluir esta etapa.'; } });
  }
  private download(blob: Blob, name: string): void {
    const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = name;
    anchor.click(); URL.revokeObjectURL(url);
  }
}
