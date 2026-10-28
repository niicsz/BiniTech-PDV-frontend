const GTIN_LENGTHS = new Set([8, 12, 13, 14]);

export function isValidBarcode(value: string): boolean {
  const code = value.trim();
  if (!code || code.length > 64) return false;
  if (!/^\d+$/.test(code) || !GTIN_LENGTHS.has(code.length)) return true;
  let sum = 0;
  for (let i = code.length - 2, weight = 3; i >= 0; i--, weight = weight === 3 ? 1 : 3) {
    sum += Number(code[i]) * weight;
  }
  return (10 - (sum % 10)) % 10 === Number(code[code.length - 1]);
}
