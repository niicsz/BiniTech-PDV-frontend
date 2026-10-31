import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FiscalProfile, FiscalProfileRequest, FiscalService } from './fiscal.service';

const EMPTY_FORM: FiscalProfileRequest = {
  cnpj: '',
  razaoSocial: '',
  inscricaoEstadual: '',
  regimeTributario: '3',
  codigoMunicipio: '',
  email: '',
  telefone: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
  cep: '',
  serieNfce: 1,
  cscId: '',
  cscToken: '',
  defaultNcm: '',
  defaultCfop: '5102',
  defaultCsosn: '102',
  autoIssue: true,
};

@Component({
  selector: 'app-fiscal-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
  ],
  template: `
    <div class="fiscal">
      <header class="fiscal-head">
        <div>
          <a routerLink="/pdv" class="back">← Voltar ao PDV</a>
          <h1>Nota Fiscal (NFC-e)</h1>
          <p class="subtitle">Configure a loja para emitir NFC-e com o seu certificado digital A1.</p>
        </div>
      </header>

      <div *ngIf="loading()" class="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <ng-container *ngIf="!loading()">
        <div class="status" [class.ok]="profile()?.readyToIssue">
          <mat-icon>{{ profile()?.readyToIssue ? 'verified' : 'pending' }}</mat-icon>
          <div>
            <strong>{{ statusTitle() }}</strong>
            <p>{{ statusText() }}</p>
          </div>
          <span class="env" *ngIf="profile()">{{ profile()?.environment === 1 ? 'Produção' : 'Homologação (sem valor fiscal)' }}</span>
        </div>

        <form class="card" (ngSubmit)="save()" #f="ngForm">
          <h2>1. Dados da empresa</h2>
          <div class="grid">
            <mat-form-field appearance="outline">
              <mat-label>CNPJ</mat-label>
              <input matInput [(ngModel)]="form.cnpj" name="cnpj" required />
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Razão social</mat-label>
              <input matInput [(ngModel)]="form.razaoSocial" name="razaoSocial" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Inscrição estadual</mat-label>
              <input matInput [(ngModel)]="form.inscricaoEstadual" name="ie" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Regime tributário</mat-label>
              <mat-select [(ngModel)]="form.regimeTributario" name="regime">
                <mat-option value="3">Simples Nacional (ME/EPP)</mat-option>
                <mat-option value="2">MEI</mat-option>
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>E-mail</mat-label>
              <input matInput type="email" [(ngModel)]="form.email" name="email" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Telefone</mat-label>
              <input matInput [(ngModel)]="form.telefone" name="telefone" />
            </mat-form-field>
          </div>

          <h2>2. Endereço</h2>
          <div class="grid">
            <mat-form-field appearance="outline">
              <mat-label>CEP</mat-label>
              <input matInput [(ngModel)]="form.cep" name="cep" (blur)="fillFromCep()" required />
              <mat-hint>Preenche o endereço e o código IBGE.</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Logradouro</mat-label>
              <input matInput [(ngModel)]="form.logradouro" name="logradouro" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Número</mat-label>
              <input matInput [(ngModel)]="form.numero" name="numero" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Complemento</mat-label>
              <input matInput [(ngModel)]="form.complemento" name="complemento" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Bairro</mat-label>
              <input matInput [(ngModel)]="form.bairro" name="bairro" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cidade</mat-label>
              <input matInput [(ngModel)]="form.cidade" name="cidade" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>UF</mat-label>
              <input matInput [(ngModel)]="form.uf" name="uf" maxlength="2" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Código IBGE do município</mat-label>
              <input matInput [(ngModel)]="form.codigoMunicipio" name="ibge" maxlength="7" required />
            </mat-form-field>
          </div>

          <h2>3. NFC-e</h2>
          <div class="grid">
            <mat-form-field appearance="outline">
              <mat-label>ID do CSC</mat-label>
              <input matInput [(ngModel)]="form.cscId" name="cscId" />
              <mat-hint>Gerado no portal da SEFAZ.</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Token do CSC</mat-label>
              <input matInput type="password" autocomplete="off" [(ngModel)]="form.cscToken" name="cscToken" />
              <mat-hint>{{ profile()?.cscConfigured ? 'Já cadastrado. Preencha só para trocar.' : 'Obrigatório para gerar o QR Code da NFC-e.' }}</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Série da NFC-e</mat-label>
              <input matInput type="number" min="1" max="999" [(ngModel)]="form.serieNfce" name="serie" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>NCM padrão</mat-label>
              <input matInput [(ngModel)]="form.defaultNcm" name="defaultNcm" maxlength="8" />
              <mat-hint>Usado quando o produto não tem NCM.</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>CFOP padrão</mat-label>
              <input matInput [(ngModel)]="form.defaultCfop" name="defaultCfop" maxlength="4" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>CSOSN padrão</mat-label>
              <input matInput [(ngModel)]="form.defaultCsosn" name="defaultCsosn" maxlength="3" />
            </mat-form-field>
          </div>
          <mat-slide-toggle [(ngModel)]="form.autoIssue" name="autoIssue">
            Emitir NFC-e automaticamente ao finalizar cada venda
          </mat-slide-toggle>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              <mat-spinner *ngIf="saving()" diameter="18"></mat-spinner>
              Salvar dados fiscais
            </button>
          </div>
        </form>

        <section class="card">
          <h2>4. Certificado digital A1</h2>
          <p class="hint" *ngIf="profile()?.certificateValidUntil as validUntil">
            Certificado atual válido até <strong>{{ formatDate(validUntil) }}</strong>.
          </p>
          <p class="hint" *ngIf="!profile()?.certificateValidUntil">
            Envie o arquivo .pfx ou .p12 do e-CNPJ da loja. A senha é usada só para validar e guardar o certificado no emissor fiscal; o BiniTech PDV não a armazena.
          </p>
          <div class="cert-row">
            <input type="file" accept=".pfx,.p12" (change)="onFile($event)" [disabled]="!profile()" />
            <mat-form-field appearance="outline">
              <mat-label>Senha do certificado</mat-label>
              <input matInput type="password" autocomplete="off" [(ngModel)]="certPassword" name="certPassword" [disabled]="!profile()" />
            </mat-form-field>
            <button mat-stroked-button (click)="uploadCertificate()" [disabled]="!profile() || !certFile || !certPassword || uploading()">
              <mat-spinner *ngIf="uploading()" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!uploading()">upload_file</mat-icon>
              Enviar certificado
            </button>
          </div>
          <p class="hint" *ngIf="!profile()">Salve os dados fiscais antes de enviar o certificado.</p>
        </section>
      </ng-container>
    </div>
  `,
  styles: [`
    .fiscal { max-width:960px; margin:0 auto; padding:40px 24px; }
    .back { color:var(--primary-text); text-decoration:none; font-size:13px; font-weight:600; }
    h1 { font-family:var(--font-display); margin:8px 0 4px; font-size:34px; font-weight:800; letter-spacing:-1px; color:var(--text); }
    .subtitle { margin:0 0 24px; color:var(--text-secondary); }
    h2 { font-family:var(--font-display); font-size:18px; font-weight:700; margin:8px 0 16px; color:var(--text); }
    .loading { display:flex; justify-content:center; padding:60px; }
    .card { background:var(--surface); border:2px solid var(--text); border-radius:var(--radius-md); padding:26px;
      box-shadow:6px 6px 0 var(--shadow-hard-color); margin-bottom:22px; display:block; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(220px, 1fr)); gap:14px 16px; margin-bottom:12px; }
    .grid .wide { grid-column:span 2; }
    .status { display:flex; gap:12px; align-items:flex-start; background:var(--warning-bg); border:1.5px solid var(--accent);
      border-radius:var(--radius-md); padding:16px 20px; margin-bottom:22px; color:var(--text); }
    .status.ok { background:var(--success-bg); border-color:var(--success); }
    .status p { margin:4px 0 0; font-size:13.5px; color:var(--text-secondary); }
    .status div { flex:1; }
    .env { font-family:var(--font-mono); font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:100px; border:1.5px solid currentColor; white-space:nowrap; }
    .actions { display:flex; justify-content:flex-end; margin-top:20px; }
    .actions button, .cert-row button { display:flex; align-items:center; gap:8px; }
    .cert-row { display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
    .hint { color:var(--text-secondary); font-size:13.5px; }
    @media (max-width: 640px) { .grid .wide { grid-column:auto; } }
  `]
})
export class FiscalSettingsComponent implements OnInit {
  private fiscalService = inject(FiscalService);
  private snackBar = inject(MatSnackBar);

  profile = signal<FiscalProfile | null>(null);
  loading = signal(false);
  saving = signal(false);
  uploading = signal(false);
  form: FiscalProfileRequest = { ...EMPTY_FORM };
  certFile: File | null = null;
  certPassword = '';

  statusTitle = computed(() => {
    const p = this.profile();
    if (!p) return 'NFC-e não configurada';
    return p.readyToIssue ? 'Pronto para emitir NFC-e' : 'Configuração incompleta';
  });

  statusText = computed(() => {
    const p = this.profile();
    if (!p) return 'Preencha os dados da empresa, o CSC e envie o certificado A1.';
    if (p.readyToIssue) {
      return p.autoIssue
        ? 'A NFC-e é emitida automaticamente ao finalizar cada venda.'
        : 'Emita a NFC-e pelo comprovante, depois de finalizar a venda.';
    }
    const missing: string[] = [];
    if (!p.cscConfigured) missing.push('CSC');
    if (!p.certificateValidUntil) missing.push('certificado A1');
    else if (new Date(p.certificateValidUntil) < new Date()) missing.push('certificado A1 válido (o atual venceu)');
    return missing.length ? `Falta: ${missing.join(', ')}.` : 'Verifique os dados fiscais.';
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.fiscalService.getProfile().subscribe({
      next: (profile) => {
        this.setProfile(profile);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erro ao carregar os dados fiscais.', 'OK', { duration: 4000 });
      },
    });
  }

  fillFromCep(): void {
    const cep = (this.form.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    this.fiscalService.lookupCep(cep).subscribe({
      next: (address) => {
        this.form.logradouro = this.form.logradouro || address.logradouro || '';
        this.form.bairro = this.form.bairro || address.bairro || '';
        this.form.cidade = address.cidade || this.form.cidade;
        this.form.uf = address.uf || this.form.uf;
        this.form.codigoMunicipio = address.codigoMunicipio || this.form.codigoMunicipio;
      },
      error: () => undefined,
    });
  }

  save(): void {
    this.saving.set(true);
    const payload: FiscalProfileRequest = {
      ...this.form,
      cscToken: this.form.cscToken?.trim() || null,
      defaultNcm: this.form.defaultNcm?.trim() || null,
      defaultCfop: this.form.defaultCfop?.trim() || null,
      defaultCsosn: this.form.defaultCsosn?.trim() || null,
    };
    this.fiscalService.saveProfile(payload).subscribe({
      next: (profile) => {
        this.saving.set(false);
        this.setProfile(profile);
        this.snackBar.open('Dados fiscais salvos.', 'OK', { duration: 4000 });
      },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.snackBar.open(this.errorMessage(error, 'Não foi possível salvar os dados fiscais.'), 'OK', { duration: 7000 });
      },
    });
  }

  onFile(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.certFile = input.files?.[0] ?? null;
  }

  uploadCertificate(): void {
    if (!this.certFile || !this.certPassword) return;
    this.uploading.set(true);
    this.fiscalService.uploadCertificate(this.certFile, this.certPassword).subscribe({
      next: (profile) => {
        this.uploading.set(false);
        this.certPassword = '';
        this.setProfile(profile);
        this.snackBar.open('Certificado A1 enviado.', 'OK', { duration: 4000 });
      },
      error: (error: HttpErrorResponse) => {
        this.uploading.set(false);
        this.snackBar.open(this.errorMessage(error, 'Não foi possível enviar o certificado.'), 'OK', { duration: 7000 });
      },
    });
  }

  formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  }

  private setProfile(profile: FiscalProfile | null): void {
    this.profile.set(profile);
    if (!profile) return;
    this.form = {
      cnpj: profile.cnpj,
      razaoSocial: profile.razaoSocial,
      inscricaoEstadual: profile.inscricaoEstadual,
      regimeTributario: profile.regimeTributario,
      codigoMunicipio: profile.codigoMunicipio,
      email: profile.email ?? '',
      telefone: profile.telefone ?? '',
      logradouro: profile.logradouro,
      numero: profile.numero,
      complemento: profile.complemento ?? '',
      bairro: profile.bairro,
      cidade: profile.cidade,
      uf: profile.uf,
      cep: profile.cep,
      serieNfce: profile.serieNfce,
      cscId: profile.cscId ?? '',
      cscToken: '',
      defaultNcm: profile.defaultNcm ?? '',
      defaultCfop: profile.defaultCfop ?? '',
      defaultCsosn: profile.defaultCsosn ?? '',
      autoIssue: profile.autoIssue,
    };
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
