import { TwoFactorError } from '../shared/models/api.models';

export interface TwoFactorFeedback {
  message: string;
  lockedUntil: Date | null;
}

export function lockMessage(lockedUntil: Date): string {
  const time = lockedUntil.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `Usuário bloqueado por 1 hora após 3 tentativas inválidas. Tente novamente às ${time}.`;
}

export function twoFactorFeedback(err: { status?: number; error?: TwoFactorError } | null, fallback: string): TwoFactorFeedback {
  const body = err?.error;
  if (err?.status === 423 || body?.code === 'TWO_FACTOR_LOCKED') {
    const lockedUntil = body?.lockedUntil ? new Date(body.lockedUntil) : null;
    return {
      message: lockedUntil ? lockMessage(lockedUntil) : body?.message || 'Usuário bloqueado temporariamente.',
      lockedUntil
    };
  }
  return { message: body?.message || fallback, lockedUntil: null };
}
