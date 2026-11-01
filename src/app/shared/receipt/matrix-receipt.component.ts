import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-matrix-receipt',
  standalone: true,
  template: `<div class="matrix-paper"><pre class="matrix-text">{{ lines.join('\n') }}</pre></div>`,
  styles: [`
    .matrix-paper {
      background:
        repeating-linear-gradient(#fdfdf8, #fdfdf8 24px, #eef3ea 24px, #eef3ea 48px);
      color: #1c1c1c;
      border: 1px dashed #9a9a9a;
      border-left: 10px dotted #c9c9c9;
      border-right: 10px dotted #c9c9c9;
      padding: 14px 12px;
      overflow-x: auto;
    }
    .matrix-text {
      margin: 0;
      font-family: "Courier New", Courier, monospace;
      font-size: 12.5px;
      line-height: 1.25;
      white-space: pre;
      letter-spacing: 0.2px;
    }
  `]
})
export class MatrixReceiptComponent {
  @Input() lines: string[] = [];
}
