import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export type DeliveryOrderStatus = 'RECEIVED' | 'ACCEPTED' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
export type DeliveryFulfillment = 'DELIVERY' | 'PICKUP';
export type DeliveryPaymentMethod = 'PIX' | 'CASH' | 'CARD';
export type SalePaymentMethod = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX';

export interface DeliverySettings {
  enabled: boolean;
  open: boolean;
  slug: string;
  storeName: string;
  whatsapp: string | null;
  message: string | null;
  deliveryFee: number;
  minimumOrder: number;
  estimatedMinutes: number;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  pickupAddress: string | null;
  acceptedPayments: DeliveryPaymentMethod[];
  pixKey: string | null;
}

export type DeliverySettingsRequest = Omit<DeliverySettings, 'slug' | 'storeName'>;

export interface DeliveryAddress {
  street: string;
  number: string;
  complement?: string | null;
  district: string;
  reference?: string | null;
}

export interface DeliveryOrderItem {
  productId: string;
  description: string;
  unitPrice: number;
  quantity: number;
  notes?: string | null;
  subtotal: number;
}

export interface DeliveryOrder {
  id: string;
  number: number;
  status: DeliveryOrderStatus;
  fulfillment: DeliveryFulfillment;
  customerName: string;
  customerPhone: string;
  address?: DeliveryAddress | null;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: DeliveryPaymentMethod;
  changeFor?: number | null;
  notes?: string | null;
  saleId?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicProduct {
  id: string;
  description: string;
  category: string;
  price: number;
  available: boolean;
  maxQuantity: number;
}

export interface PublicStore {
  slug: string;
  name: string;
  open: boolean;
  message?: string | null;
  deliveryFee: number;
  minimumOrder: number;
  estimatedMinutes: number;
  deliveryAvailable: boolean;
  pickupAvailable: boolean;
  pickupAddress?: string | null;
  acceptedPayments: DeliveryPaymentMethod[];
  products: PublicProduct[];
}

export interface PlaceOrderRequest {
  customerName: string;
  customerPhone: string;
  fulfillment: DeliveryFulfillment;
  address?: DeliveryAddress | null;
  paymentMethod: DeliveryPaymentMethod;
  changeFor?: number | null;
  notes?: string | null;
  items: { productId: string; quantity: number; notes?: string | null }[];
}

export interface PlacedOrder {
  id: string;
  number: number;
  status: DeliveryOrderStatus;
  fulfillment: DeliveryFulfillment;
  items: DeliveryOrderItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentMethod: DeliveryPaymentMethod;
  pixKey?: string | null;
  whatsappUrl: string;
  createdAt: string;
}

export const PAYMENT_LABELS: Record<DeliveryPaymentMethod, string> = {
  PIX: 'Pix',
  CASH: 'Dinheiro',
  CARD: 'Cartão na entrega',
};

export const STATUS_LABELS: Record<DeliveryOrderStatus, string> = {
  RECEIVED: 'Novo',
  ACCEPTED: 'Em preparo',
  DISPATCHED: 'Saiu / pronto',
  COMPLETED: 'Concluído',
  CANCELLED: 'Cancelado',
};

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private readonly http = inject(HttpClient);

  getSettings(): Observable<DeliverySettings> {
    return this.http.get<DeliverySettings>('/api/delivery/settings');
  }

  updateSettings(request: DeliverySettingsRequest): Observable<DeliverySettings> {
    return this.http.put<DeliverySettings>('/api/delivery/settings', request);
  }

  listOrders(status?: DeliveryOrderStatus): Observable<DeliveryOrder[]> {
    const params = status ? new HttpParams().set('status', status) : undefined;
    return this.http.get<DeliveryOrder[]>('/api/delivery/orders', { params });
  }

  updateStatus(id: string, status: DeliveryOrderStatus): Observable<DeliveryOrder> {
    return this.http.patch<DeliveryOrder>(`/api/delivery/orders/${encodeURIComponent(id)}/status`, { status });
  }

  complete(id: string, paymentMethod: SalePaymentMethod): Observable<DeliveryOrder> {
    return this.http.post<DeliveryOrder>(`/api/delivery/orders/${encodeURIComponent(id)}/complete`, { paymentMethod });
  }

  getStore(slug: string): Observable<PublicStore> {
    return this.http.get<PublicStore>(`/api/public/delivery/${encodeURIComponent(slug)}`);
  }

  placeOrder(slug: string, request: PlaceOrderRequest): Observable<PlacedOrder> {
    return this.http.post<PlacedOrder>(`/api/public/delivery/${encodeURIComponent(slug)}/orders`, request);
  }

  trackOrder(slug: string, orderId: string): Observable<PlacedOrder> {
    return this.http.get<PlacedOrder>(
      `/api/public/delivery/${encodeURIComponent(slug)}/orders/${encodeURIComponent(orderId)}`,
    );
  }
}

export function brl(value: number | null | undefined): string {
  return (value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function formatPhone(digits: string | null | undefined): string {
  if (!digits) return '';
  const local = digits.startsWith('55') && digits.length > 11 ? digits.slice(2) : digits;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return digits;
}
