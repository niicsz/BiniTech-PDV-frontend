import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ProductService } from '../../../pos/services/product.service';
import { ProductDTO, CreateProductDTO } from '../../../shared/models/api.models';
import { AnalyticsService } from '../../../core/analytics.service';
import { AuthService } from '../../../auth/services/auth.service';
import { isValidBarcode } from '../../../core/barcode';

@Component({
  selector: 'app-product-list',
  imports: [
    CommonModule, FormsModule,
    RouterLink,
    MatButtonModule, MatIconModule,
    MatFormFieldModule, MatInputModule, MatSelectModule,
    MatTooltipModule
  ],
  templateUrl: './product-list.component.html',
  styleUrls: ['./product-list.component.scss']
})
export class ProductListComponent implements OnInit {

  products: ProductDTO[] = [];
  showForm = false;
  editingId: string | null = null;

  selectedCategory = '';
  searchTerm = '';

  currentPage = 1;
  pageSize = 50;

  form: CreateProductDTO = {
    barcode: '',
    description: '',
    price: 0,
    costPrice: 0,
    stockQuantity: 0,
    category: '',
    ncm: '',
    cfop: '',
    csosn: '',
    active: true
  };

  statusMessage = '';
  statusType: 'success' | 'error' = 'success';
  private statusTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private productService: ProductService,
    private analytics: AnalyticsService,
    private authService: AuthService
  ) {}

  canModify(product: ProductDTO): boolean {
    return this.authService.canManageAllProducts() || product.userId === this.authService.getUserId();
  }

  private validateForm(): string | null {
    const f = this.form;
    if (!f.barcode?.trim()) return 'Informe o código de barras.';
    if (!isValidBarcode(f.barcode)) return 'Código de barras inválido: o dígito verificador não confere.';
    if (!f.description?.trim()) return 'Informe a descrição do produto.';
    if (!(Number(f.price) > 0)) return 'Informe um preço de venda maior que zero.';
    if (Number(f.costPrice) < 0) return 'O preço de custo não pode ser negativo.';
    if (!Number.isInteger(Number(f.stockQuantity)) || Number(f.stockQuantity) < 0) {
      return 'O estoque deve ser um número inteiro igual ou maior que zero.';
    }
    if (f.ncm?.trim() && !/^\d{8}$/.test(f.ncm.trim())) return 'O NCM deve ter 8 dígitos.';
    if (f.cfop?.trim() && !/^\d{4}$/.test(f.cfop.trim())) return 'O CFOP deve ter 4 dígitos.';
    if (f.csosn?.trim() && !/^\d{3}$/.test(f.csosn.trim())) return 'O CSOSN deve ter 3 dígitos.';
    return null;
  }

  private payload(): CreateProductDTO {
    return {
      ...this.form,
      ncm: this.form.ncm?.trim() || null,
      cfop: this.form.cfop?.trim() || null,
      csosn: this.form.csosn?.trim() || null,
    };
  }

  ngOnInit(): void {
    this.loadProducts();
  }

  get categories(): string[] {
    return this.products
      .map(p => p.category || 'Sem Categoria')
      .filter((v, i, a) => a.indexOf(v) === i)
      .sort();
  }

  get activeCount(): number {
    return this.products.filter(p => p.active).length;
  }

  get lowStockCount(): number {
    return this.products.filter(p => (p.stockQuantity ?? 0) <= 5 && p.active).length;
  }

  get totalSaleValue(): number {
    return this.filteredProducts.reduce((sum, p) => sum + (p.price || 0) * (p.stockQuantity || 0), 0);
  }

  get totalCostValue(): number {
    return this.filteredProducts.reduce((sum, p) => sum + (p.costPrice || 0) * (p.stockQuantity || 0), 0);
  }

  get filteredProducts(): ProductDTO[] {
    let result = this.products;

    if (this.selectedCategory) {
      result = result.filter(p =>
        (p.category || 'Sem Categoria') === this.selectedCategory
      );
    }

    if (this.searchTerm.trim()) {
      const term = this.searchTerm.trim().toLowerCase();
      result = result.filter(p =>
        (p.description && p.description.toLowerCase().includes(term)) ||
        (p.barcode && p.barcode.toLowerCase().includes(term))
      );
    }

    return result;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredProducts.length / this.pageSize);
  }

  get paginatedProducts(): ProductDTO[] {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredProducts.slice(start, start + this.pageSize);
  }

  get pageNumbers(): number[] {
    const total = this.totalPages;
    const current = this.currentPage;
    const pages: number[] = [];
    const range = 2;
    for (let i = Math.max(1, current - range); i <= Math.min(total, current + range); i++) {
      pages.push(i);
    }
    return pages;
  }

  onFilterChange(): void {
    this.currentPage = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
    }
  }

  loadProducts(): void {
    this.productService.listAllPages().subscribe({
      next: (products) => {
        this.products = products;
        this.currentPage = 1;
        console.info('[ProductList] Produtos carregados:', products.length);
      },
      error: () => {
        console.error('[ProductList] Erro ao carregar produtos');
        this.showStatus('Erro ao carregar produtos.', 'error');
      }
    });
  }

  openCreateForm(): void {
    this.editingId = null;
    this.form = { barcode: '', description: '', price: 0, costPrice: 0, stockQuantity: 0, category: '', ncm: '', cfop: '', csosn: '', active: true };
    this.showForm = true;
  }

  openEditForm(product: ProductDTO): void {
    this.editingId = product.id!;
    this.form = {
      barcode: product.barcode || '',
      description: product.description || '',
      price: product.price || 0,
      costPrice: product.costPrice || 0,
      stockQuantity: product.stockQuantity || 0,
      category: product.category || '',
      ncm: product.ncm || '',
      cfop: product.cfop || '',
      csosn: product.csosn || '',
      active: product.active ?? true
    };
    this.showForm = true;
  }

  saveProduct(): void {
    const invalid = this.validateForm();
    if (invalid) {
      this.showStatus(invalid, 'error');
      return;
    }
    if (this.editingId) {
      console.info('[ProductList] Atualizando produto:', this.editingId);
      this.productService.update(this.editingId, this.payload()).subscribe({
        next: () => {
          console.info('[ProductList] Produto atualizado com sucesso:', this.editingId);
          this.showStatus('Produto atualizado com sucesso!', 'success');
          this.showForm = false;
          this.loadProducts();
        },
        error: (err) => {
          console.error('[ProductList] Erro ao atualizar produto:', err.error?.message);
          this.showStatus(err.error?.message || 'Erro ao atualizar.', 'error');
        }
      });
    } else {
      console.info('[ProductList] Criando novo produto:', this.form.description);
      const firstProduct = this.products.length === 0;
      this.productService.create(this.payload()).subscribe({
        next: () => {
          console.info('[ProductList] Produto criado com sucesso:', this.form.description);
          this.analytics.track('product_created', { source: 'manual' });
          if (firstProduct) this.analytics.trackOnce('first_product', 'first_product_created', { source: 'manual' });
          this.showStatus('Produto cadastrado com sucesso!', 'success');
          this.showForm = false;
          this.loadProducts();
        },
        error: (err) => {
          console.error('[ProductList] Erro ao cadastrar produto:', err.error?.message);
          this.showStatus(err.error?.message || 'Erro ao cadastrar.', 'error');
        }
      });
    }
  }

  deleteProduct(id: string): void {
    if (confirm('Inativar este produto? Ele sai do caixa e pode ser reativado depois.')) {
      console.info('[ProductList] Inativando produto:', id);
      this.productService.delete(id).subscribe({
        next: () => {
          console.info('[ProductList] Produto inativado com sucesso:', id);
          this.showStatus('Produto inativado. Ele não aparece mais no caixa.', 'success');
          this.loadProducts();
        },
        error: (err) => {
          console.error('[ProductList] Erro ao inativar produto:', id);
          this.showStatus(err.error?.message || 'Erro ao inativar produto.', 'error');
        }
      });
    }
  }

  reactivateProduct(product: ProductDTO): void {
    const dto: CreateProductDTO = {
      barcode: product.barcode || '',
      description: product.description || '',
      price: product.price || 0,
      costPrice: product.costPrice || 0,
      stockQuantity: product.stockQuantity || 0,
      category: product.category || '',
      ncm: product.ncm || null,
      cfop: product.cfop || null,
      csosn: product.csosn || null,
      active: true
    };
    this.productService.update(product.id!, dto).subscribe({
      next: () => {
        this.showStatus('Produto reativado.', 'success');
        this.loadProducts();
      },
      error: (err) => this.showStatus(err.error?.message || 'Erro ao reativar produto.', 'error')
    });
  }

  cancelForm(): void {
    this.showForm = false;
  }

  showStatus(message: string, type: 'success' | 'error'): void {
    this.statusMessage = message;
    this.statusType = type;
    if (this.statusTimeout) clearTimeout(this.statusTimeout);
    this.statusTimeout = setTimeout(() => this.statusMessage = '', 4000);
  }
}
