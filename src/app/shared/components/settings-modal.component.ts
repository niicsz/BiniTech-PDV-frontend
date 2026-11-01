import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { ThemeService, ThemeColors } from '../services/theme.service';
import { AnalyticsService } from '../../core/analytics.service';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../auth/services/auth.service';
import { FiscalFeatureService } from '../../fiscal/fiscal-feature.service';

@Component({
  selector: 'app-settings-modal',
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatSnackBarModule],
  template: `
    <div class="modal-overlay" (click)="close.emit()">
      <mat-card class="modal-card" (click)="$event.stopPropagation()" appearance="outlined">
        <mat-card-header>
          <mat-card-title>Configurações de Aparência</mat-card-title>
          <button mat-icon-button class="close-btn" (click)="close.emit()">
            <mat-icon>close</mat-icon>
          </button>
        </mat-card-header>

        <mat-card-content>
          <p class="description">Personalize as cores do sistema ao seu gosto.</p>

          <div class="form-group">
            <label for="primaryColor">Cor Primária (Links, Botões)</label>
            <div class="color-picker-wrapper">
              <input type="color" id="primaryColor" [(ngModel)]="colors.primary"
                     (change)="updateColor('primary', colors.primary!)">
              <span class="color-value">{{ colors.primary || '#d4391a' }}</span>
            </div>
          </div>

          <div class="form-group">
            <label for="headerBg">Cor do Cabeçalho</label>
            <div class="color-picker-wrapper">
              <input type="color" id="headerBg" [(ngModel)]="colors.headerBg"
                     (change)="updateColor('headerBg', colors.headerBg!)">
              <span class="color-value">{{ colors.headerBg || '#241a12' }}</span>
            </div>
          </div>
          <div class="fiscal-section" *ngIf="canManageFiscal">
            <h4>Nota fiscal (NFC-e)</h4>
            <mat-slide-toggle [checked]="fiscalFeature.enabled()" (change)="toggleNfce($event.checked)" [disabled]="savingFiscal">
              Minha loja emite NFC-e
            </mat-slide-toggle>
            <p class="description">Deixe desligado se você vende como pessoa física ou não tem inscrição estadual.</p>
          </div>
        </mat-card-content>

        <mat-card-actions align="end">
          <button mat-stroked-button (click)="resetColors()">
            <mat-icon>restart_alt</mat-icon>
            Restaurar Padrões
          </button>
          <button mat-flat-button color="primary" (click)="close.emit()">
            <mat-icon>check</mat-icon>
            Concluir
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .fiscal-section { border-top: 1px dashed var(--border); margin-top: 16px; padding-top: 12px; }
    .fiscal-section h4 { margin: 0 0 8px; }
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-card {
      width: 100%;
      max-width: 420px;
      padding: 8px 24px 16px;
    }
    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .close-btn {
      margin-left: auto;
    }
    .description {
      color: var(--text-secondary);
      margin-bottom: 16px;
    }
    .form-group {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 16px;
    }
    .form-group label {
      font-weight: 500;
      color: var(--text);
    }
    .color-picker-wrapper {
      display: flex;
      align-items: center;
      gap: 12px;
      background: var(--bg);
      padding: 8px 12px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }
    input[type="color"] {
      -webkit-appearance: none;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      padding: 0;
      cursor: pointer;
    }
    input[type="color"]::-webkit-color-swatch-wrapper { padding: 0; }
    input[type="color"]::-webkit-color-swatch {
      border: none;
      border-radius: 50%;
      box-shadow: 0 0 0 1px var(--border);
    }
    .color-value {
      font-family: monospace;
      color: var(--text-secondary);
      text-transform: uppercase;
    }
    mat-card-actions {
      display: flex;
      gap: 8px;
      padding: 16px 0 0;
    }
  `]
})
export class SettingsModalComponent {
  @Output() close = new EventEmitter<void>();

  themeService = inject(ThemeService);
  private readonly analytics = inject(AnalyticsService);
  private readonly snackBar = inject(MatSnackBar);
  readonly fiscalFeature = inject(FiscalFeatureService);
  readonly canManageFiscal = inject(AuthService).canManageTenantUsers();
  savingFiscal = false;
  colors: ThemeColors = {};

  constructor() {
    this.colors = { ...this.themeService.customColors() };
    if (!this.colors.primary) this.colors.primary = '#d4391a';
    if (!this.colors.headerBg) this.colors.headerBg = '#241a12';
  }

  updateColor(key: keyof ThemeColors, value: string) {
    this.themeService.updateColor(key, value);
    this.analytics.track('settings_changed', { setting: `color_${key}` });
  }

  toggleNfce(enabled: boolean) {
    this.savingFiscal = true;
    this.fiscalFeature.decide(enabled).subscribe({
      next: () => {
        this.savingFiscal = false;
        this.analytics.track('settings_changed', { setting: enabled ? 'nfce_on' : 'nfce_off' });
      },
      error: () => {
        this.savingFiscal = false;
        this.snackBar.open('Não foi possível salvar a opção de NFC-e.', 'OK', { duration: 5000 });
      },
    });
  }

  resetColors() {
    this.themeService.resetColors();
    this.analytics.track('settings_changed', { setting: 'color_reset' });
    this.colors = { primary: '#d4391a', headerBg: '#241a12' };
  }
}