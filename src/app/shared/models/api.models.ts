export interface ProductDTO {
  id?: string;
  barcode?: string;
  description?: string;
  price?: number;
  costPrice?: number;
  stockQuantity?: number;
  active?: boolean;
  category?: string;
  ncm?: string | null;
  cfop?: string | null;
  csosn?: string | null;
  userId?: string;
}

export interface CreateProductDTO {
  barcode: string;
  description: string;
  price: number;
  costPrice: number;
  stockQuantity: number;
  category: string;
  ncm?: string | null;
  cfop?: string | null;
  csosn?: string | null;
  active?: boolean;
}

export interface SaleDTO {
  id?: string;
  items?: SaleItemDTO[];
  payments?: PaymentDTO[];
  totalAmount?: number;
  totalCost?: number;
  totalPaid?: number;
  change?: number;
  timestamp?: string;
  userId?: string;
  customerName?: string;
  customerPhone?: string;
  paid?: boolean;
}

export interface SaleItemDTO {
  productId?: string;
  productDescription?: string;
  quantity?: number;
  unitPrice?: number;
  costPrice?: number;
  subtotal?: number;
}

export interface CreateSaleDTO {
  items: CreateSaleItemDTO[];
  payments: PaymentDTO[];
  customerName?: string;
  customerPhone?: string;
  skipStockValidation?: boolean;
}

export interface CreateSaleItemDTO {
  productId: string;
  quantity: number;
}

export interface PaymentDTO {
  method: PaymentMethodEnum;
  amount: number;
}

export type PaymentMethodEnum = 'CASH' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CREDIARIO';

export interface ErrorDTO {
  code?: string;
  message?: string;
  timestamp?: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  tenantId?: string;
}

export interface RegisterRequest {
  username: string;
  password: string;
  role: 'ADMIN' | 'OPERATOR';
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
  tenantId?: string;
  twoFactorRequired?: boolean;
  challengeToken?: string;
  challengeExpiresAt?: string;
}

export interface TwoFactorStatus {
  enabled: boolean;
  lockedUntil?: string | null;
  recoveryCodesRemaining?: number;
}

export interface TwoFactorRecoveryCodes {
  recoveryCodes: string[];
}

export interface TwoFactorSetup {
  secret?: string;
  otpauthUri: string;
  algorithm: string;
  digits: number;
  period: number;
}

export interface TwoFactorError {
  code?: string;
  message?: string;
  remainingAttempts?: number | null;
  lockedUntil?: string | null;
}
