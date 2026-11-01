import { SaleDTO } from '../models/api.models';

export const MATRIX_COLUMNS = 48;

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Dinheiro',
  CREDIT_CARD: 'Cartao de Credito',
  DEBIT_CARD: 'Cartao de Debito',
  PIX: 'PIX',
  CREDIARIO: 'Crediario / Fiado',
};

export interface ReceiptOptions {
  operator?: string | null;
  storeName?: string | null;
  columns?: number;
}

export function plain(value: string | null | undefined): string {
  return (value ?? '')
    .normalize('NFD')
    .replaceAll(/[̀-ͯ]/g, '')
    .replaceAll(/[^\x20-\x7E]/g, '')
    .replaceAll(/\s+/g, ' ')
    .trim();
}

export function money(value: number | null | undefined): string {
  return (value ?? 0).toFixed(2).replace('.', ',');
}

function center(text: string, width: number): string {
  const value = text.slice(0, width);
  const left = Math.floor((width - value.length) / 2);
  return ' '.repeat(left) + value;
}

function columns(left: string, right: string, width: number): string {
  const available = width - right.length - 1;
  const leftPart = left.length > available ? left.slice(0, available) : left;
  return leftPart + ' '.repeat(width - leftPart.length - right.length) + right;
}

function wrap(text: string, width: number, indent = ''): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const chunk = word.length > width - indent.length ? word.slice(0, width - indent.length) : word;
    const candidate = current ? `${current} ${chunk}` : chunk;
    if ((indent + candidate).length > width) {
      lines.push(indent + current);
      current = chunk;
    } else {
      current = candidate;
    }
  }
  if (current) {
    lines.push(indent + current);
  }
  return lines;
}

function formatDate(timestamp?: string): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function buildSaleReceipt(sale: SaleDTO, options: ReceiptOptions = {}): string[] {
  const width = options.columns ?? MATRIX_COLUMNS;
  const rule = '-'.repeat(width);
  const doubleRule = '='.repeat(width);
  const lines: string[] = [
    doubleRule,
    center(plain(options.storeName || 'BiniTech PDV').toUpperCase(), width),
    center('COMPROVANTE DE VENDA', width),
    center('*** NAO E DOCUMENTO FISCAL ***', width),
    doubleRule,
    columns(`Venda: #${(sale.id ?? '').slice(0, 8)}`, formatDate(sale.timestamp), width),
  ];

  if (options.operator) {
    lines.push(`Operador: ${plain(options.operator)}`.slice(0, width));
  }
  if (sale.customerName) {
    lines.push(`Cliente: ${plain(sale.customerName)}`.slice(0, width));
  }
  if (sale.customerPhone) {
    lines.push(`Telefone: ${plain(sale.customerPhone)}`.slice(0, width));
  }
  if (sale.customerCpf) {
    const cpf = sale.customerCpf.replaceAll(/\D/g, '');
    const masked = cpf.length === 11 ? `${cpf.slice(0, 3)}.***.***-${cpf.slice(9)}` : cpf;
    lines.push(`CPF: ${masked}`);
  }
  lines.push(
    rule,
    columns('ITEM DESCRICAO', '', width).trimEnd(),
    columns('     QTD x VL.UNIT', 'SUBTOTAL', width),
    rule,
  );

  (sale.items ?? []).forEach((item, index) => {
    const number = String(index + 1).padStart(3, '0');
    const description = plain(item.productDescription).toUpperCase() || 'PRODUTO';
    const descriptionLines = wrap(`${number} ${description}`, width).map((line, i) =>
      i === 0 ? line : `    ${line.trimStart()}`.slice(0, width),
    );
    lines.push(
      ...descriptionLines,
      columns(`     ${item.quantity ?? 0} x ${money(item.unitPrice)}`, money(item.subtotal), width),
    );
  });

  lines.push(
    rule,
    columns('TOTAL R$', money(sale.totalAmount), width),
    rule,
    ...(sale.payments ?? []).map((payment) =>
      columns(PAYMENT_LABELS[payment.method] ?? plain(payment.method), money(payment.amount), width),
    ),
    columns('Total pago', money(sale.totalPaid), width),
  );
  if ((sale.change ?? 0) > 0) {
    lines.push(columns('Troco', money(sale.change), width));
  }
  lines.push(
    doubleRule,
    center('Obrigado pela preferencia!', width),
    center('BiniTech PDV', width),
    '',
  );
  return lines;
}

export function printMatrix(lines: string[], title = 'Comprovante'): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.title = title;
  const meta = doc.createElement('meta');
  meta.setAttribute('charset', 'utf-8');
  const style = doc.createElement('style');
  style.textContent = [
    '@page { margin: 4mm; }',
    'html, body { margin: 0; padding: 0; background: #fff; color: #000; }',
    'pre { margin: 0; font-family: "Courier New", Courier, monospace; font-size: 12px; line-height: 1.25; white-space: pre; }',
  ].join('\n');
  doc.head.append(meta, style);
  const pre = doc.createElement('pre');
  pre.textContent = lines.join('\n');
  doc.body.replaceChildren(pre);
  const win = frame.contentWindow;
  setTimeout(() => {
    win?.focus();
    win?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 50);
}
