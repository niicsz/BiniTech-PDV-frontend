export function sanitizeTwoFactorCode(value: string, recovery: boolean): string {
  if (!recovery) {
    return value.replace(/\D/g, '');
  }
  const chars = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
  return chars.length > 5 ? `${chars.slice(0, 5)}-${chars.slice(5)}` : chars;
}

export function isTwoFactorCode(value: string, recovery: boolean): boolean {
  return recovery ? /^[A-Z0-9]{5}-[A-Z0-9]{5}$/.test(value) : /^\d{6,8}$/.test(value);
}

export function twoFactorCodeHint(recovery: boolean): string {
  return recovery
    ? 'Informe um código de recuperação no formato XXXXX-XXXXX.'
    : 'Informe o código de 6 dígitos do aplicativo autenticador.';
}
