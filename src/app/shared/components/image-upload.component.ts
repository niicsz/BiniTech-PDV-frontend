import { Component, EventEmitter, Input, Output, computed, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { imageFileError, imageSrc } from '../../core/image-url';

@Component({
  selector: 'app-image-upload',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  template: `
    <div class="image-upload" [class.wide]="shape === 'banner'" [class.round]="shape === 'round'">
      <div class="preview" [attr.aria-label]="label">
        @if (src(); as url) {
          <img [src]="url" [alt]="label" />
        } @else {
          <mat-icon>{{ placeholderIcon }}</mat-icon>
        }
        @if (busy) {
          <div class="busy"><mat-spinner diameter="28"></mat-spinner></div>
        }
      </div>
      <div class="side">
        <strong>{{ label }}</strong>
        @if (hint) { <span class="hint">{{ hint }}</span> }
        <div class="buttons">
          <label class="pick" [class.disabled]="busy || disabled">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              [disabled]="busy || disabled"
              (change)="pick($event)"
              [attr.data-testid]="testId ? testId + '-input' : null"
            />
            <mat-icon>upload</mat-icon>
            {{ src() ? 'Trocar' : 'Enviar' }}
          </label>
          @if (src()) {
            <button mat-button type="button" class="remove" (click)="removed.emit()" [disabled]="busy || disabled">
              <mat-icon>delete</mat-icon> Remover
            </button>
          }
        </div>
        @if (error()) { <span class="error" role="alert">{{ error() }}</span> }
      </div>
    </div>
  `,
  styles: [`
    .image-upload { display:flex; gap:16px; align-items:center; flex-wrap:wrap; }
    .preview { position:relative; width:96px; height:96px; border:2px dashed var(--border, #cfcfcf); border-radius:12px;
      display:flex; align-items:center; justify-content:center; overflow:hidden; background:var(--surface-alt, #f6f6f6);
      color:var(--text-secondary); flex:none; }
    .round .preview { border-radius:50%; }
    .wide .preview { width:min(100%, 360px); height:120px; }
    .preview img { width:100%; height:100%; object-fit:cover; }
    .round .preview img { object-fit:contain; background:#fff; }
    .preview mat-icon { font-size:34px; width:34px; height:34px; }
    .busy { position:absolute; inset:0; background:rgba(255,255,255,.7); display:flex; align-items:center; justify-content:center; }
    .side { display:flex; flex-direction:column; gap:6px; min-width:0; }
    .hint { color:var(--text-secondary); font-size:13px; }
    .buttons { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
    .pick { display:inline-flex; align-items:center; gap:6px; padding:6px 14px; border:2px solid var(--text); border-radius:100px;
      font-weight:700; cursor:pointer; font-size:14px; background:var(--surface); color:var(--text); }
    .pick.disabled { opacity:.5; cursor:default; }
    .pick input { position:absolute; width:1px; height:1px; opacity:0; pointer-events:none; }
    .pick:focus-within { outline:2px solid var(--primary, #c0271c); outline-offset:2px; }
    .remove { color:var(--danger); }
    .error { color:var(--danger); font-size:13px; font-weight:600; }
  `],
})
export class ImageUploadComponent {
  @Input() label = 'Imagem';
  @Input() hint = '';
  @Input() shape: 'square' | 'round' | 'banner' = 'square';
  @Input() placeholderIcon = 'image';
  @Input() busy = false;
  @Input() disabled = false;
  @Input() testId = '';
  @Input() set url(value: string | null | undefined) {
    this.current.set(value ?? null);
  }
  @Input() set errorMessage(value: string | null | undefined) {
    this.error.set(value ?? null);
  }

  @Output() selected = new EventEmitter<File>();
  @Output() removed = new EventEmitter<void>();

  private readonly current = signal<string | null>(null);
  readonly error = signal<string | null>(null);
  readonly src = computed(() => imageSrc(this.current()));

  pick(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const problem = imageFileError(file);
    this.error.set(problem);
    if (!problem) this.selected.emit(file);
  }
}
