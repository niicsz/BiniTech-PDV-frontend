import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CartItem } from '../../../shared/models/cart.model';

@Component({
  selector: 'app-cart-table',
  imports: [CommonModule, MatIconModule, MatButtonModule, MatTooltipModule],
  template: `
    <section class="cart-wrapper" aria-label="Itens da venda">
      <table class="cart-table" *ngIf="items.length > 0">
        <thead>
          <tr>
            <th scope="col" class="col-seq">Item</th>
            <th scope="col" class="col-desc">Produto</th>
            <th scope="col" class="col-qty">Qtd.</th>
            <th scope="col" class="col-price">Unitário</th>
            <th scope="col" class="col-subtotal">Subtotal</th>
            <th scope="col" class="col-actions"><span class="sr-only">Remover</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            *ngFor="let item of items; let i = index"
            [class.selected]="i === selectedIndex"
            [attr.aria-selected]="i === selectedIndex"
            (click)="selectItem.emit(i)">
            <td class="col-seq num">{{ i + 1 }}</td>
            <td class="col-desc">
              <span class="desc">{{ item.description }}</span>
              <span class="barcode num">{{ item.barcode }}</span>
            </td>
            <td class="col-qty num">{{ item.quantity }}</td>
            <td class="col-price num">R$ {{ item.unitPrice | number:'1.2-2' }}</td>
            <td class="col-subtotal num">R$ {{ item.subtotal | number:'1.2-2' }}</td>
            <td class="col-actions">
              <button mat-icon-button matTooltip="Remover item" [attr.aria-label]="'Remover ' + item.description"
                      (click)="removeItem.emit(i); $event.stopPropagation()">
                <mat-icon>close</mat-icon>
              </button>
            </td>
          </tr>
        </tbody>
      </table>

      <div class="cart-empty" *ngIf="items.length === 0">
        <p class="empty-title">Nenhum item nesta venda.</p>
        <p class="empty-hint">
          Leia o código de barras ou digite o nome do produto e tecle <kbd>Enter</kbd>.
          Depois escolha a forma de pagamento ao lado.
        </p>
      </div>
    </section>
  `,
  styles: [`
    .cart-wrapper {
      min-height: 420px;
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: var(--radius-md);
      overflow: auto;
    }

    .cart-table {
      width: 100%;
      border-collapse: collapse;

      th, td {
        padding: 0 12px;
        text-align: left;
      }

      thead th {
        position: sticky;
        top: 0;
        z-index: 1;
        height: 40px;
        background: var(--surface);
        color: var(--text-secondary);
        font-size: 12px;
        font-weight: 400;
        border-bottom: 1px solid var(--border);
      }

      tbody tr {
        height: 56px;
        border-bottom: 1px solid var(--border-light);
        cursor: pointer;
        transition: background-color 120ms var(--ease);

        &:hover {
          background: var(--table-hover);
        }

        &.selected {
          background: var(--primary-bg);
        }
      }

      tbody tr:last-child {
        border-bottom: 0;
      }

      th:first-child, td:first-child {
        padding-left: 20px;
      }

      .col-seq {
        width: 56px;
        color: var(--text-secondary);
      }
      .col-desc {
        min-width: 200px;
      }
      .desc {
        display: block;
        font-weight: 500;
      }
      .barcode {
        display: block;
        color: var(--text-secondary);
        font-size: 12px;
        line-height: 16px;
      }
      .col-qty {
        width: 64px;
        text-align: right;
        font-weight: 500;
      }
      .col-price {
        width: 112px;
        text-align: right;
        color: var(--text-secondary);
        white-space: nowrap;
      }
      .col-subtotal {
        width: 124px;
        text-align: right;
        font-weight: 500;
        white-space: nowrap;
      }
      .col-actions {
        width: 56px;
        text-align: right;
        --mat-icon-button-icon-color: var(--text-secondary);
      }
    }

    .cart-empty {
      margin: 20px;
      padding: 16px;
      border: 1px dashed var(--control);
      border-radius: var(--radius-md);
      color: var(--text-secondary);
    }

    .empty-title {
      color: var(--text);
      font-weight: 500;
      margin-bottom: 4px;
    }

    kbd {
      display: inline-flex;
      align-items: center;
      height: 20px;
      padding: 0 6px;
      border: 1px solid var(--control);
      border-radius: 4px;
      background: var(--surface);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 11px;
    }

    @media (max-width: 1100px) {
      .cart-table .col-price {
        display: none;
      }
    }

    @media (max-width: 860px) {
      .cart-wrapper {
        min-height: 0;
      }
      .cart-table {
        th, td {
          padding: 0 8px;
        }
        .col-seq {
          display: none;
        }
        .col-desc {
          min-width: 0;
        }
        th:nth-child(2), td:nth-child(2) {
          padding-left: 16px;
        }
      }
    }
  `]
})
export class CartTableComponent {
  @Input() items: CartItem[] = [];
  @Input() selectedIndex = -1;
  @Output() selectItem = new EventEmitter<number>();
  @Output() removeItem = new EventEmitter<number>();
}
