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
import { FiscalIssuer, FiscalIssuerRequest, FiscalService } from './fiscal.service';

function emptyForm(): FiscalIssuerRequest {
  return {
    cnpj: '',
    razaoSocial: '',
    nomeFantasia: '',
    inscricaoEstadual: '',
    regime: 'SIMPLES_NACIONAL',
    address: {
      logradouro: '',
      numero: '',
      complemento: '',
      bairro: '',
      codigoMunicipio: '',
      cidade: '',
      uf: '',
      cep: '',
    },
    telefone: '',
    email: '',
    serie: 1,
    nfeSerie: 1,
    defaultNcm: '',
    defaultCfop: '5102',
    defaultCsosn: '102',
    autoIssue: true,
    contingencyEnabled: true,
  };
}

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
      <header>
        <a routerLink="/pdv" class="back">← Voltar ao PDV</a>
        <h1>Nota Fiscal (NFC-e)</h1>
        <p class="subtitle">A NFC-e é emitida direto na SEFAZ e assinada com o certificado digital A1 da sua loja.</p>
      </header>

      <div *ngIf="loading()" class="loading"><mat-spinner diameter="36"></mat-spinner></div>

      <ng-container *ngIf="!loading()">
        <div class="status" [class.ok]="issuer()?.readyToIssue">
          <mat-icon>{{ issuer()?.readyToIssue ? 'verified' : 'pending' }}</mat-icon>
          <div>
            <strong>{{ statusTitle() }}</strong>
            <p>{{ statusText() }}</p>
          </div>
          <span class="env" *ngIf="issuer()">{{ issuer()?.environment === 1 ? 'Produção' : 'Homologação (sem valor fiscal)' }}</span>
        </div>

        <form class="card" (ngSubmit)="save()">
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
              <mat-label>Nome fantasia</mat-label>
              <input matInput [(ngModel)]="form.nomeFantasia" name="nomeFantasia" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Inscrição estadual</mat-label>
              <input matInput [(ngModel)]="form.inscricaoEstadual" name="ie" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Regime tributário</mat-label>
              <mat-select [(ngModel)]="form.regime" name="regime">
                <mat-option value="SIMPLES_NACIONAL">Simples Nacional (ME/EPP)</mat-option>
                <mat-option value="MEI">MEI</mat-option>
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
              <input matInput [(ngModel)]="form.address.cep" name="cep" (blur)="fillFromCep()" required />
              <mat-hint>Preenche o endereço e o código IBGE.</mat-hint>
            </mat-form-field>
            <mat-form-field appearance="outline" class="wide">
              <mat-label>Logradouro</mat-label>
              <input matInput [(ngModel)]="form.address.logradouro" name="logradouro" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Número</mat-label>
              <input matInput [(ngModel)]="form.address.numero" name="numero" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Complemento</mat-label>
              <input matInput [(ngModel)]="form.address.complemento" name="complemento" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Bairro</mat-label>
              <input matInput [(ngModel)]="form.address.bairro" name="bairro" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Cidade</mat-label>
              <input matInput [(ngModel)]="form.address.cidade" name="cidade" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>UF</mat-label>
              <input matInput [(ngModel)]="form.address.uf" name="uf" maxlength="2" required />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Código IBGE do município</mat-label>
              <input matInput [(ngModel)]="form.address.codigoMunicipio" name="ibge" maxlength="7" required />
            </mat-form-field>
          </div>

          <h2>3. Emissão</h2>
          <div class="grid">
            <mat-form-field appearance="outline">
              <mat-label>Série da NFC-e</mat-label>
              <input matInput type="number" min="1" max="889" [(ngModel)]="form.serie" name="serie" />
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Série da NF-e de devolução</mat-label>
              <input matInput type="number" min="1" max="889" [(ngModel)]="form.nfeSerie" name="nfeSerie" />
              <mat-hint>Modelo 55. Use uma série que a loja não usa em outro sistema.</mat-hint>
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
              <mat-select [(ngModel)]="form.defaultCsosn" name="defaultCsosn">
                <mat-option value="102">102 - Tributada sem permissão de crédito</mat-option>
                <mat-option value="103">103 - Isenção por faixa de receita</mat-option>
                <mat-option value="300">300 - Imune</mat-option>
                <mat-option value="400">400 - Não tributada</mat-option>
                <mat-option value="500">500 - ICMS cobrado por substituição tributária</mat-option>
              </mat-select>
            </mat-form-field>
          </div>
          <div class="toggles">
            <mat-slide-toggle [(ngModel)]="form.autoIssue" name="autoIssue">
              Emitir NFC-e automaticamente ao finalizar cada venda
            </mat-slide-toggle>
            <mat-slide-toggle [(ngModel)]="form.contingencyEnabled" name="contingencyEnabled">
              Usar contingência offline quando a SEFAZ estiver fora do ar
            </mat-slide-toggle>
          </div>

          <div class="actions">
            <button mat-flat-button color="primary" type="submit" [disabled]="saving()">
              <mat-spinner *ngIf="saving()" diameter="18"></mat-spinner>
              Salvar dados fiscais
            </button>
          </div>
        </form>

        <section class="card">
          <h2>4. Certificado digital A1</h2>
          <p class="hint" *ngIf="issuer()?.certificateValidUntil as validUntil">
            Certificado de <strong>{{ issuer()?.certificateHolder }}</strong>, válido até <strong>{{ formatDate(validUntil) }}</strong>.
          </p>
          <p class="hint">
            Envie o arquivo .pfx ou .p12 do e-CNPJ da loja. O arquivo e a senha ficam guardados criptografados e só são usados para assinar as notas da sua loja.
          </p>
          <div class="cert-row">
            <input type="file" accept=".pfx,.p12" (change)="onFile($event)" [disabled]="!issuer()" />
            <mat-form-field appearance="outline">
              <mat-label>Senha do certificado</mat-label>
              <input matInput type="password" autocomplete="off" [(ngModel)]="certPassword" name="certPassword" [disabled]="!issuer()" />
            </mat-form-field>
            <button mat-stroked-button (click)="uploadCertificate()" [disabled]="!issuer() || !certFile || !certPassword || uploading()">
              <mat-spinner *ngIf="uploading()" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!uploading()">upload_file</mat-icon>
              Enviar certificado
            </button>
          </div>
          <p class="hint" *ngIf="!issuer()">Salve os dados fiscais antes de enviar o certificado.</p>

          <div class="sefaz-row" *ngIf="issuer()?.readyToIssue">
            <button mat-stroked-button (click)="checkSefaz()" [disabled]="checking()">
              <mat-spinner *ngIf="checking()" diameter="18"></mat-spinner>
              <mat-icon *ngIf="!checking()">wifi_tethering</mat-icon>
              Testar conexão com a SEFAZ
            </button>
            <span *ngIf="sefazMessage()" [class.ok]="sefazOk()">{{ sefazMessage() }}</span>
          </div>
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
    .toggles { display:flex; flex-direction:column; gap:12px; }
    .status { display:flex; gap:12px; align-items:flex-start; background:var(--warning-bg); border:1.5px solid var(--accent);
      border-radius:var(--radius-md); padding:16px 20px; margin-bottom:22px; color:var(--text); }
    .status.ok { background:var(--success-bg); border-color:var(--success); }
    .status p { margin:4px 0 0; font-size:13.5px; color:var(--text-secondary); }
    .status div { flex:1; }
    .env { font-family:var(--font-mono); font-size:11.5px; font-weight:700; padding:4px 10px; border-radius:100px; border:1.5px solid currentColor; white-space:nowrap; }
    .actions { display:flex; justify-content:flex-end; margin-top:20px; }
    .actions button, .cert-row button, .sefaz-row button { display:flex; align-items:center; gap:8px; }
    .cert-row, .sefaz-row { display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
    .sefaz-row { margin-top:12px; }
    .sefaz-row span { color:var(--danger); font-size:13.5px; }
    .sefaz-row span.ok { color:var(--success); }
    .hint { color:var(--text-secondary); font-size:13.5px; }
    @media (max-width: 640px) { .grid .wide { grid-column:auto; } }
  `]
})
export class FiscalSettingsComponent implements OnInit {
  private readonly fiscalService = inject(FiscalService);
  private readonly snackBar = inject(MatSnackBar);

  issuer = signal<FiscalIssuer | null>(null);
  loading = signal(false);
  saving = signal(false);
  uploading = signal(false);
  checking = signal(false);
  sefazMessage = signal('');
  sefazOk = signal(false);
  form: FiscalIssuerRequest = emptyForm();
  certFile: File | null = null;
  certPassword = '';

  statusTitle = computed(() => {
    const issuer = this.issuer();
    if (!issuer) return 'NFC-e não configurada';
    return issuer.readyToIssue ? 'Pronto para emitir NFC-e' : 'Configuração incompleta';
  });

  statusText = computed(() => {
    const issuer = this.issuer();
    if (!issuer) return 'Preencha os dados da empresa e envie o certificado A1 da loja.';
    if (issuer.readyToIssue) {
      return issuer.autoIssue
        ? 'A NFC-e é emitida automaticamente ao finalizar cada venda.'
        : 'Emita a NFC-e pelo comprovante, depois de finalizar a venda.';
    }
    if (!issuer.certificateValidUntil) return 'Falta enviar o certificado digital A1.';
    return 'O certificado A1 venceu. Envie o certificado renovado.';
  });

  ngOnInit(): void {
    this.loading.set(true);
    this.fiscalService.getIssuer().subscribe({
      next: (issuer) => {
        this.setIssuer(issuer);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.snackBar.open('Erro ao carregar os dados fiscais.', 'OK', { duration: 4000 });
      },
    });
  }

  fillFromCep(): void {
    const cep = (this.form.address.cep || '').replace(/\D/g, '');
    if (cep.length !== 8) return;
    this.fiscalService.lookupCep(cep).subscribe({
      next: (address) => {
        const current = this.form.address;
        this.form.address = {
          ...current,
          logradouro: current.logradouro || address.logradouro || '',
          bairro: current.bairro || address.bairro || '',
          cidade: address.cidade || current.cidade,
          uf: address.uf || current.uf,
          codigoMunicipio: address.codigoMunicipio || current.codigoMunicipio,
        };
      },
      error: () => undefined,
    });
  }

  save(): void {
    this.saving.set(true);
    const payload: FiscalIssuerRequest = {
      ...this.form,
      nomeFantasia: this.form.nomeFantasia?.trim() || null,
      defaultNcm: this.form.defaultNcm?.trim() || null,
      defaultCfop: this.form.defaultCfop?.trim() || null,
      defaultCsosn: this.form.defaultCsosn?.trim() || null,
    };
    this.fiscalService.saveIssuer(payload).subscribe({
      next: (issuer) => {
        this.saving.set(false);
        this.setIssuer(issuer);
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
      next: (issuer) => {
        this.uploading.set(false);
        this.certPassword = '';
        this.setIssuer(issuer);
        this.snackBar.open('Certificado A1 enviado.', 'OK', { duration: 4000 });
      },
      error: (error: HttpErrorResponse) => {
        this.uploading.set(false);
        this.snackBar.open(this.errorMessage(error, 'Não foi possível enviar o certificado.'), 'OK', { duration: 7000 });
      },
    });
  }

  checkSefaz(): void {
    this.checking.set(true);
    this.sefazMessage.set('');
    this.fiscalService.sefazStatus().subscribe({
      next: (status) => {
        this.checking.set(false);
        this.sefazOk.set(status.kind === 'AUTHORIZED');
        this.sefazMessage.set(`${status.cStat} - ${status.xMotivo}`);
      },
      error: (error: HttpErrorResponse) => {
        this.checking.set(false);
        this.sefazOk.set(false);
        this.sefazMessage.set(this.errorMessage(error, 'Não foi possível consultar a SEFAZ.'));
      },
    });
  }

  formatDate(value: string): string {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString('pt-BR');
  }

  private setIssuer(issuer: FiscalIssuer | null): void {
    this.issuer.set(issuer);
    if (!issuer) return;
    this.form = {
      cnpj: issuer.cnpj,
      razaoSocial: issuer.razaoSocial,
      nomeFantasia: issuer.nomeFantasia ?? '',
      inscricaoEstadual: issuer.inscricaoEstadual,
      regime: issuer.regime,
      address: {
        ...issuer.address,
        numero: issuer.address.numero ?? '',
        complemento: issuer.address.complemento ?? '',
      },
      telefone: issuer.telefone ?? '',
      email: issuer.email ?? '',
      serie: issuer.serie,
      nfeSerie: issuer.nfeSerie ?? 1,
      defaultNcm: issuer.defaultNcm ?? '',
      defaultCfop: issuer.defaultCfop ?? '',
      defaultCsosn: issuer.defaultCsosn ?? '102',
      autoIssue: issuer.autoIssue,
      contingencyEnabled: issuer.contingencyEnabled,
    };
  }

  private errorMessage(error: HttpErrorResponse, fallback: string): string {
    const message = error.error?.message;
    return typeof message === 'string' && message.trim() ? message : fallback;
  }
}
