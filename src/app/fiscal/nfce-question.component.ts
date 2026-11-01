import { Component, EventEmitter, Output, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FiscalFeatureService } from './fiscal-feature.service';

@Component({
  selector: 'app-nfce-question',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="nfce-question-title">
      <div class="dialog">
        <mat-icon class="icon">receipt_long</mat-icon>
        <h2 id="nfce-question-title">Sua loja emite nota fiscal (NFC-e)?</h2>
        <p>
          A NFC-e é o cupom fiscal eletrônico e exige <strong>CNPJ com inscrição estadual</strong> e um
          <strong>certificado digital A1</strong>.
        </p>
        <p class="muted">
          Se você vende como pessoa física ou não tem inscrição estadual, escolha "Não emito". O PDV continua
          imprimindo o comprovante de venda normalmente. Dá para mudar isso depois em Configurações.
        </p>
        <div class="actions">
          <button mat-stroked-button (click)="answer(false)" [disabled]="saving()">Não emito NFC-e</button>
          <button mat-flat-button color="primary" (click)="answer(true)" [disabled]="saving()">
            Sim, quero emitir NFC-e
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overlay { position:fixed; inset:0; background:rgba(20,14,10,.55); display:flex; align-items:center; justify-content:center; z-index:1200; padding:16px; }
    .dialog { background:var(--surface); color:var(--text); border:2px solid var(--text); border-radius:var(--radius-md);
      box-shadow:6px 6px 0 var(--shadow-hard-color); max-width:520px; width:100%; padding:28px; }
    .icon { color:var(--primary-text); font-size:36px; width:36px; height:36px; }
    h2 { font-family:var(--font-display); font-size:22px; margin:10px 0 12px; }
    p { margin:0 0 10px; line-height:1.5; font-size:14.5px; }
    .muted { color:var(--text-secondary); font-size:13.5px; }
    .actions { display:flex; gap:12px; justify-content:flex-end; flex-wrap:wrap; margin-top:20px; }
  `]
})
export class NfceQuestionComponent {
  @Output() answered = new EventEmitter<boolean>();

  private readonly feature = inject(FiscalFeatureService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  readonly saving = signal(false);

  answer(enabled: boolean): void {
    this.saving.set(true);
    this.feature.decide(enabled).subscribe({
      next: () => {
        this.saving.set(false);
        this.answered.emit(enabled);
        if (enabled) {
          this.router.navigate(['/fiscal']);
        }
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Não foi possível salvar sua escolha. Tente de novo.', 'OK', { duration: 5000 });
      },
    });
  }
}
