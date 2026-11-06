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
  deliveryVisible?: boolean;
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
  deliveryVisible?: boolean;
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
  customerCpf?: string;
  paid?: boolean;
  status?: SaleStatus;
  returnedAmount?: number;
  returnedCost?: number;
  returns?: SaleReturnDTO[];
  itemsTotal?: number;
  discount?: number;
  surcharge?: number;
  cashSessionId?: string;
}

export type SaleStatus = 'COMPLETED' | 'PARTIALLY_RETURNED' | 'RETURNED';

export type RefundMethod = 'CASH' | 'PIX' | 'CREDIT_CARD' | 'DEBIT_CARD' | 'DEBT_DEDUCTION';

export interface SaleReturnDTO {
  id?: string;
  timestamp?: string;
  userId?: string;
  items?: SaleItemDTO[];
  refundAmount?: number;
  refundCost?: number;
  refundMethod?: RefundMethod;
  reason?: string;
  restocked?: boolean;
}

export interface CreateSaleReturnDTO {
  items: CreateSaleItemDTO[];
  refundMethod: RefundMethod;
  reason?: string;
  restock: boolean;
}

export interface SaleItemDTO {
  productId?: string;
  productDescription?: string;
  quantity?: number;
  unitPrice?: number;
  costPrice?: number;
  subtotal?: number;
  discount?: number;
  surcharge?: number;
}

export interface CreateSaleDTO {
  items: CreateSaleItemDTO[];
  payments: PaymentDTO[];
  customerName?: string;
  customerPhone?: string;
  customerCpf?: string;
  skipStockValidation?: boolean;
  discount?: number;
  surcharge?: number;
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

export type CashSessionStatus = 'OPEN' | 'CLOSED';

export type CashMovementType = 'SUPPLY' | 'WITHDRAWAL';

export interface CashMovementDTO {
  id: string;
  type: CashMovementType;
  amount: number;
  reason?: string;
  userId?: string;
  timestamp?: string;
}

export interface PaymentTotalDTO {
  method: PaymentMethodEnum;
  amount: number;
}

export interface CashSessionSummaryDTO {
  salesCount: number;
  salesTotal: number;
  discountTotal: number;
  surchargeTotal: number;
  receivedByMethod: PaymentTotalDTO[];
  cashSales: number;
  cashRefunds: number;
  supplies: number;
  withdrawals: number;
  expectedCash: number;
}

export interface CashSessionDTO {
  id: string;
  userId?: string;
  operatorName?: string;
  status: CashSessionStatus;
  openedAt?: string;
  openingAmount: number;
  movements: CashMovementDTO[];
  closedAt?: string;
  closedByUserId?: string;
  countedAmount?: number | null;
  difference?: number | null;
  notes?: string;
  summary?: CashSessionSummaryDTO;
  pendingDeliveryOrders?: number;
}
