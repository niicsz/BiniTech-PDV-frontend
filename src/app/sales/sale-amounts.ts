import { RefundMethod, SaleDTO, SaleStatus } from '../shared/models/api.models';

export const REFUND_LABELS: Record<RefundMethod, string> = {
  CASH: 'Dinheiro',
  PIX: 'Pix',
  CREDIT_CARD: 'Estorno no cartão de crédito',
  DEBIT_CARD: 'Estorno no cartão de débito',
  DEBT_DEDUCTION: 'Abatido do fiado',
};

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function netAmount(sale: SaleDTO): number {
  return round2((sale.totalAmount ?? 0) - (sale.returnedAmount ?? 0));
}

export function netCost(sale: SaleDTO): number {
  return round2((sale.totalCost ?? 0) - (sale.returnedCost ?? 0));
}

export function saleStatus(sale: SaleDTO): SaleStatus {
  return sale.status ?? 'COMPLETED';
}

export function returnedQuantity(sale: SaleDTO, productId: string | undefined): number {
  return (sale.returns ?? [])
    .flatMap(r => r.items ?? [])
    .filter(item => item.productId === productId)
    .reduce((sum, item) => sum + (item.quantity ?? 0), 0);
}

export function hasOpenCrediario(sale: SaleDTO): boolean {
  return !sale.paid && (sale.payments ?? []).some(p => p.method === 'CREDIARIO');
}
