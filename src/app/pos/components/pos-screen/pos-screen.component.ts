import { Component, OnInit, OnDestroy, ViewChild, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatChipsModule } from '@angular/material/chips';
import { forkJoin } from 'rxjs';
import { ProductService } from '../../services/product.service';
import { SaleService } from '../../services/sale.service';
import { AuthService } from '../../../auth/services/auth.service';
import { CartItem } from '../../../shared/models/cart.model';
import {
  ProductDTO, CreateSaleDTO, CreateSaleItemDTO,
  PaymentDTO, PaymentMethodEnum, SaleDTO, CreateProductDTO
} from '../../../shared/models/api.models';
import { CartTableComponent } from '../cart-table/cart-table.component';
import { PaymentModalComponent, PaymentConfirmation } from '../payment-modal/payment-modal.component';
import { AnalyticsService } from '../../../core/analytics.service';

@Component({
  selector: 'app-pos-screen',
  imports: [
    CommonModule, FormsModule, CartTableComponent, PaymentModalComponent,
    MatCardModule, MatButtonModule, MatIconModule, MatFormFieldModule, MatInputModule, MatChipsModule
  ],
  templateUrl: './pos-screen.component.html',
  styleUrls: ['./pos-screen.component.scss']
})
export class PosScreenComponent implements OnInit, OnDestroy {

  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;

  cart: CartItem[] = [];
  barcodeValue = '';
  total = 0;

  showPaymentModal = false;
  initialPaymentMethod: PaymentMethodEnum | null = null;
  paymentErrorMessage = '';
  paymentProcessing = false;

  showQuantityModal = false;
  selectedCartIndex = -1;
  newQuantity = 1;

  showReceiptModal = false;
  lastSale: SaleDTO | null = null;

  statusMessage = '';
  statusType: 'success' | 'error' | 'info' = 'info';
  private statusTimeout: any;
  private hideDropdownTimeout: ReturnType<typeof setTimeout> | null = null;

  loggedInUsername = '';

  showLowStockAlert = false;
  lowStockProducts: { description: string; stockQuantity: number }[] = [];
  private pendingLowStockProducts: { description: string; stockQuantity: number }[] = [];

  showOutOfStockModal = false;
  outOfStockProduct: ProductDTO | null = null;
  outOfStockRequestedQty = 1;
  hasOutOfStockItems = false;

  allProducts: ProductDTO[] = [];
  filteredProducts: ProductDTO[] = [];
  showDropdown = false;
  dropdownSelectedIndex = -1;

  constructor(
    private productService: ProductService,
    private saleService: SaleService,
    private authService: AuthService,
    private analytics: AnalyticsService
  ) {}

  ngOnInit(): void {
    this.loggedInUsername = this.authService.getUsername() || 'Operador';
    console.info('[PosScreen] Tela PDV inicializada para:', this.loggedInUsername);
    this.focusBarcode();
    this.loadProducts();
  }

  loadProducts(): void {
    this.productService.listAllPages().subscribe({
      next: (products) => {
        this.allProducts = products.filter(p => p.active !== false);
        console.info('[PosScreen] Produtos carregados para busca offline:', products.length);
      },
      error: () => {
        console.warn('[PosScreen] Não foi possível carregar os produtos para busca offline');
      }
    });
  }

  ngOnDestroy(): void {
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    this.cancelHideDropdown();
  }

  @HostListener('window:keydown', ['$event'])
  handleKeyboard(event: KeyboardEvent): void {
    if (this.showOutOfStockModal) {
      if (event.key === 'Escape') {
        this.closeOutOfStockModal();
        event.preventDefault();
      }
      return;
    }

    if (this.showLowStockAlert) {
      if (event.key === 'Escape' || event.key === 'Enter') {
        this.closeLowStockAlert();
        event.preventDefault();
      }
      return;
    }

    if (this.showPaymentModal || this.showReceiptModal) {
      if (event.key === 'Escape') {
        this.closePaymentModal();
        this.closeReceiptModal();
        event.preventDefault();
      }
      return;
    }

    if (this.showDropdown) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        this.dropdownSelectedIndex = Math.min(this.dropdownSelectedIndex + 1, this.filteredProducts.length - 1);
        return;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        this.dropdownSelectedIndex = Math.max(this.dropdownSelectedIndex - 1, 0);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        this.hideDropdown();
        return;
      }
    }

    switch (event.key) {
      case 'F2':
        event.preventDefault();
        this.openQuantityModal();
        break;
      case 'F4':
        event.preventDefault();
        this.startPayment('CASH');
        break;
      case 'F7':
        event.preventDefault();
        this.startPayment('CREDIT_CARD');
        break;
      case 'F8':
        event.preventDefault();
        this.startPayment('DEBIT_CARD');
        break;
      case 'F9':
        event.preventDefault();
        this.startPayment('PIX');
        break;
      case 'F10':
        event.preventDefault();
        this.startPayment('CREDIARIO');
        break;
      case 'Delete':
        event.preventDefault();
        this.removeSelectedItem();
        break;
      case 'Escape':
        event.preventDefault();
        this.closeQuantityModal();
        this.focusBarcode();
        break;
    }
  }

  hideDropdown(): void {
    this.cancelHideDropdown();
    this.hideDropdownTimeout = setTimeout(() => {
      this.hideDropdownTimeout = null;
      this.showDropdown = false;
      this.filteredProducts = [];
      this.dropdownSelectedIndex = -1;
    }, 150);
  }

  private cancelHideDropdown(): void {
    if (this.hideDropdownTimeout) {
      clearTimeout(this.hideDropdownTimeout);
      this.hideDropdownTimeout = null;
    }
  }

  onSearchChange(): void {
    this.cancelHideDropdown();
    const val = this.barcodeValue.trim().toLowerCase();
    
    if (val.length < 2) {
      this.hideDropdown();
      return;
    }

    this.filteredProducts = this.allProducts
      .filter(p => 
        (p.description && p.description.toLowerCase().includes(val)) ||
        (p.barcode && p.barcode.includes(val))
      )
      .slice(0, 8);

    this.showDropdown = this.filteredProducts.length > 0;
    this.dropdownSelectedIndex = this.showDropdown ? 0 : -1;
  }

  onBarcodeSubmit(): void {
    const barcode = this.barcodeValue.trim();
    if (!barcode) return;

    if (this.showDropdown && this.dropdownSelectedIndex >= 0) {
      const selected = this.filteredProducts[this.dropdownSelectedIndex];
      this.trackSearch();
      this.addToCart(selected);
      this.barcodeValue = '';
      this.hideDropdown();
      this.focusBarcode();
      return;
    }

    const exactMatch = this.allProducts.find(p => p.barcode === barcode);
    if (exactMatch) {
      this.addToCart(exactMatch);
      this.barcodeValue = '';
      this.hideDropdown();
      this.focusBarcode();
      return;
    }

    this.productService.getByBarcode(barcode).subscribe({
      next: (product: ProductDTO) => {
        console.info('[PosScreen] Produto encontrado por barcode da API:', product.description);
        if (product.active === false) {
          this.showStatus(`Produto inativo: ${product.description}. Reative em Produtos para vender.`, 'error');
          this.barcodeValue = '';
          this.hideDropdown();
          this.focusBarcode();
          return;
        }
        this.addToCart(product);
        this.barcodeValue = '';
        this.hideDropdown();
        this.focusBarcode();
      },
      error: () => {
        console.warn('[PosScreen] Produto não encontrado por barcode:', barcode);
        this.analytics.track('product_not_found');
        this.showStatus(`Produto não encontrado: ${barcode}`, 'error');
        this.barcodeValue = '';
        this.hideDropdown();
        this.focusBarcode();
      }
    });
  }

  selectFromDropdown(product: ProductDTO): void {
    this.trackSearch();
    this.addToCart(product);
    this.barcodeValue = '';
    this.hideDropdown();
    this.focusBarcode();
  }

  addToCart(product: ProductDTO): void {
    const existing = this.cart.find(item => item.productId === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    const newTotalQty = currentQtyInCart + 1;
    const availableStock = product.stockQuantity ?? 0;

    if (newTotalQty > availableStock) {
      this.outOfStockProduct = product;
      this.outOfStockRequestedQty = 1;
      this.showOutOfStockModal = true;
      return;
    }

    this.doAddToCart(product);
  }

  private doAddToCart(product: ProductDTO, forceSkipStock = false): void {
    const existing = this.cart.find(item => item.productId === product.id);
    if (existing) {
      existing.quantity += 1;
      existing.subtotal = existing.quantity * existing.unitPrice;
    } else {
      this.cart.push({
        productId: product.id!,
        barcode: product.barcode || '',
        description: product.description || '',
        quantity: 1,
        unitPrice: product.price || 0,
        subtotal: product.price || 0,
        stockQuantity: product.stockQuantity ?? 0
      });
    }
    if (forceSkipStock) {
      this.hasOutOfStockItems = true;
    }
    this.recalculateTotal();
    this.showStatus(`${product.description} adicionado ao carrinho`, 'success');
  }

  confirmAddStockAndSell(): void {
    if (!this.outOfStockProduct) return;
    const product = this.outOfStockProduct;
    const existing = this.cart.find(item => item.productId === product.id);
    const currentQtyInCart = existing ? existing.quantity : 0;
    const needed = currentQtyInCart + this.outOfStockRequestedQty;
    const currentStock = product.stockQuantity ?? 0;
    const newStock = needed > currentStock ? needed : currentStock;

    const updateDto: CreateProductDTO = {
      barcode: product.barcode!,
      description: product.description!,
      price: product.price!,
      costPrice: product.costPrice || 0,
      stockQuantity: newStock,
      category: product.category || '',
      active: product.active ?? true
    };

    this.productService.update(product.id!, updateDto).subscribe({
      next: (updated) => {
        console.info('[PosScreen] Estoque atualizado com sucesso para produto:', product.description, 'novo estoque:', updated.stockQuantity);
        const idx = this.allProducts.findIndex(p => p.id === product.id);
        if (idx >= 0) this.allProducts[idx] = updated;
        this.outOfStockProduct!.stockQuantity = updated.stockQuantity;
        this.doAddToCart(this.outOfStockProduct!);
        this.closeOutOfStockModal();
      },
      error: () => {
        console.error('[PosScreen] Erro ao atualizar estoque do produto:', product.description);
        this.showStatus('Erro ao atualizar estoque do produto.', 'error');
        this.closeOutOfStockModal();
      }
    });
  }

  confirmSellWithoutStock(): void {
    if (!this.outOfStockProduct) return;
    this.doAddToCart(this.outOfStockProduct, true);
    this.closeOutOfStockModal();
  }

  closeOutOfStockModal(): void {
    this.showOutOfStockModal = false;
    this.outOfStockProduct = null;
    this.focusBarcode();
  }

  removeItem(index: number): void {
    const item = this.cart[index];
    this.cart.splice(index, 1);
    if (this.selectedCartIndex === index) {
      this.selectedCartIndex = -1;
    } else if (this.selectedCartIndex > index) {
      this.selectedCartIndex--;
    }
    this.recalculateTotal();
    this.analytics.track('item_removed_from_cart', { quantity: item.quantity, cart_items: this.cart.length });
    this.showStatus(`${item.description} removido`, 'info');
    this.focusBarcode();
  }

  removeSelectedItem(): void {
    if (this.selectedCartIndex >= 0 && this.selectedCartIndex < this.cart.length) {
      this.removeItem(this.selectedCartIndex);
    }
  }

  selectItem(index: number): void {
    this.selectedCartIndex = index;
  }

  recalculateTotal(): void {
    this.total = this.cart.reduce((sum, item) => sum + item.subtotal, 0);
  }

  cancelSale(): void {
    if (this.cart.length > 0 && !window.confirm('Limpar o carrinho e cancelar esta venda?')) {
      this.focusBarcode();
      return;
    }
    if (this.cart.length > 0) {
      this.analytics.track('sale_canceled', { value: this.total, currency: 'BRL', items_count: this.getTotalQty() });
    }
    this.clearCart();
  }

  clearCart(): void {
    this.cart = [];
    this.selectedCartIndex = -1;
    this.total = 0;
    this.hasOutOfStockItems = false;
    this.focusBarcode();
  }

  openQuantityModal(): void {
    if (this.cart.length === 0) {
      this.showStatus('Carrinho vazio. Adicione um produto primeiro.', 'error');
      return;
    }
    if (this.selectedCartIndex < 0) {
      this.selectedCartIndex = this.cart.length - 1;
    }
    this.newQuantity = this.cart[this.selectedCartIndex].quantity;
    this.showQuantityModal = true;
  }

  confirmQuantity(): void {
    if (this.newQuantity < 1) {
      this.showStatus('Quantidade deve ser pelo menos 1.', 'error');
      return;
    }
    const item = this.cart[this.selectedCartIndex];
    item.quantity = this.newQuantity;
    item.subtotal = item.quantity * item.unitPrice;
    this.recalculateTotal();
    this.showQuantityModal = false;
    this.showStatus(`Quantidade de "${item.description}" alterada para ${item.quantity}`, 'success');
    this.focusBarcode();
  }

  closeQuantityModal(): void {
    this.showQuantityModal = false;
    this.focusBarcode();
  }

  startPayment(method: PaymentMethodEnum): void {
    if (this.cart.length === 0) {
      this.showStatus('Carrinho vazio. Adicione produtos antes de finalizar.', 'error');
      return;
    }
    this.initialPaymentMethod = method;
    this.paymentErrorMessage = '';
    this.paymentProcessing = false;
    this.showPaymentModal = true;
  }

  onPaymentsConfirmed(confirmation: PaymentConfirmation): void {
    const items: CreateSaleItemDTO[] = this.cart.map(item => ({
      productId: item.productId,
      quantity: item.quantity
    }));

    const soldProductIds = this.cart.map(item => item.productId);
    const sale: CreateSaleDTO = {
      items,
      payments: confirmation.payments,
      ...(confirmation.customerName ? { customerName: confirmation.customerName } : {}),
      ...(confirmation.customerPhone ? { customerPhone: confirmation.customerPhone } : {}),
      ...(this.hasOutOfStockItems ? { skipStockValidation: true } : {})
    };

    this.paymentProcessing = true;
    this.paymentErrorMessage = '';

    const methods = [...new Set(confirmation.payments.map(p => p.method))];
    const saleParams = {
      currency: 'BRL',
      payment_method: methods.length === 1 ? methods[0] : 'MULTIPLE',
      payment_count: confirmation.payments.length,
      items_count: this.getTotalQty(),
      on_credit: methods.includes('CREDIARIO'),
      skip_stock: this.hasOutOfStockItems
    };

    console.info('[PosScreen] Finalizando venda com', items.length, 'item(ns), total:', this.total);
    this.saleService.create(sale).subscribe({
      next: (result: SaleDTO) => {
        this.paymentProcessing = false;
        this.trackSaleCompleted({ ...saleParams, value: result.totalAmount ?? this.total });
        this.lastSale = result;
        this.showPaymentModal = false;
        this.showReceiptModal = true;
        this.clearCart();
        this.hasOutOfStockItems = false;
        console.info('[PosScreen] Venda finalizada com sucesso: id=', result.id, 'total=', result.totalAmount);
        this.showStatus('Venda finalizada com sucesso!', 'success');
        this.checkLowStock(soldProductIds);
      },
      error: (err) => {
        this.paymentProcessing = false;
        const msg = err.error?.message || 'Erro ao finalizar a venda.';
        this.paymentErrorMessage = msg;
        this.analytics.track('payment_failed', {
          ...saleParams,
          value: this.total,
          reason: this.paymentFailureReason(msg),
          status: err.status ?? 0
        });
        console.error('[PosScreen] Erro ao finalizar venda:', msg);
      }
    });
  }

  private trackSaleCompleted(params: Record<string, string | number | boolean>): void {
    this.analytics.track('sale_completed', params);
    if (!this.analytics.enabled || this.analytics.hasDone('first_sale')) return;
    // Uma consulta por loja/navegador: confirma que é a primeira venda da loja.
    this.saleService.listAll().subscribe({
      next: sales => {
        if (sales.length <= 1) this.analytics.trackOnce('first_sale', 'first_sale_completed', params);
        else this.analytics.markDone('first_sale');
      },
      error: () => {}
    });
  }

  /** Categoria do erro, sem repassar a mensagem (pode conter nomes de produtos/clientes). */
  private paymentFailureReason(message: string): string {
    const msg = message.toLowerCase();
    if (msg.includes('pagamento insuficiente')) return 'insufficient_payment';
    if (msg.includes('estoque')) return 'insufficient_stock';
    if (msg.includes('cliente') || msg.includes('crediário') || msg.includes('crediario')) return 'credit_customer';
    return 'other';
  }

  private trackSearch(): void {
    const term = this.barcodeValue.trim();
    if (term && !/^\d+$/.test(term)) {
      this.analytics.track('search', { search_term: term.slice(0, 100) });
    }
  }

  private checkLowStock(productIds: string[]): void {
    const uniqueIds = [...new Set(productIds)];
    const requests = uniqueIds.map(id => this.productService.getById(id));

    forkJoin(requests).subscribe({
      next: (products: ProductDTO[]) => {
        const lowStock = products
          .filter(p => (p.stockQuantity ?? 0) < 5)
          .map(p => ({
            description: p.description || 'Sem descrição',
            stockQuantity: p.stockQuantity ?? 0
          }));

        if (lowStock.length > 0) {
          console.warn('[PosScreen] Produtos com estoque baixo detectados:', lowStock.length, lowStock.map(p => `${p.description} (${p.stockQuantity})`));
          this.pendingLowStockProducts = lowStock;
        }
      },
      error: () => {
        console.warn('[PosScreen] Não foi possível verificar estoque dos produtos');
      }
    });
  }

  private showPendingLowStockAlert(): void {
    if (this.pendingLowStockProducts.length > 0) {
      this.lowStockProducts = this.pendingLowStockProducts;
      this.pendingLowStockProducts = [];
      this.showLowStockAlert = true;
    }
  }

  closeLowStockAlert(): void {
    this.showLowStockAlert = false;
    this.lowStockProducts = [];
    this.focusBarcode();
  }

  closePaymentModal(): void {
    this.showPaymentModal = false;
    this.focusBarcode();
  }

  closeReceiptModal(): void {
    this.showReceiptModal = false;
    this.lastSale = null;
    this.showPendingLowStockAlert();
    if (!this.showLowStockAlert) {
      this.focusBarcode();
    }
  }

  printReceipt(): void {
    window.print();
  }

  focusBarcode(): void {
    setTimeout(() => {
      this.barcodeInput?.nativeElement?.focus();
    }, 50);
  }

  showStatus(message: string, type: 'success' | 'error' | 'info'): void {
    this.statusMessage = message;
    this.statusType = type;
    if (this.statusTimeout) {
      clearTimeout(this.statusTimeout);
    }
    this.statusTimeout = setTimeout(() => {
      this.statusMessage = '';
    }, 4000);
  }

  getPaymentLabel(method: string): string {
    const labels: Record<string, string> = {
      'CASH': 'Dinheiro',
      'CREDIT_CARD': 'Cartão de Crédito',
      'DEBIT_CARD': 'Cartão de Débito',
      'PIX': 'PIX',
      'CREDIARIO': 'Crediário / Fiado'
    };
    return labels[method] || method;
  }

  formatTimestamp(ts?: string): string {
    if (!ts) return '';
    const d = new Date(ts);
    return d.toLocaleString('pt-BR');
  }

  getTotalQty(): number {
    return this.cart.reduce((sum, item) => sum + item.quantity, 0);
  }
}
