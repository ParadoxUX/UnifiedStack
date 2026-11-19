/**
 * Денежные ошибки с корректными HTTP-кодами.
 *
 * Тексты сообщений — только публичные: без баланса, сумм и внутренней логики.
 * Детали (баланс, reference, стек) остаются в логе Strapi.
 */

import { errors } from '@strapi/utils';

const ApplicationError = errors.ApplicationError;

/** Класс ошибки уровня приложения (тип для расширения). */
type StrapiApplicationError = InstanceType<typeof ApplicationError>;

export const WALLET_ERRORS = {
  insufficientFunds: 'Недостаточно средств на балансе',
  walletMissing: 'Кошелёк не найден',
  gameMissing: 'Игра не найдена',
  gameUnavailable: 'Игра недоступна для покупки',
  alreadyOwned: 'Игра уже приобретена',
  dlcMissing: 'Дополнение не найдено',
  dlcAlreadyOwned: 'Дополнение уже приобретено',
  transactionMissing: 'Транзакция не найдена',
  alreadyReversed: 'Транзакция уже отменена',
  referenceConflict: 'Транзакция с таким идентификатором уже существует',
  balanceConflict: 'Операция не выполнена, повторите попытку',
  invalidInput: 'Некорректные данные запроса',
  limitExceeded: 'Превышен допустимый размер операции',
  forbidden: 'Недостаточно прав для выполнения операции',
} as const;

export type WalletErrorKind = keyof typeof WALLET_ERRORS;

/** HTTP-статус по типу ошибки. */
const STATUS_BY_KIND: Record<WalletErrorKind, number> = {
  insufficientFunds: 402,
  limitExceeded: 422,
  invalidInput: 422,
  walletMissing: 404,
  gameMissing: 404,
  dlcMissing: 404,
  transactionMissing: 404,
  gameUnavailable: 409,
  alreadyOwned: 409,
  dlcAlreadyOwned: 409,
  alreadyReversed: 409,
  referenceConflict: 409,
  balanceConflict: 409,
  forbidden: 403,
};

/** Ошибка уровня приложения с публичным текстом и меткой типа. */
export type WalletError = StrapiApplicationError & { kind: WalletErrorKind };

export function walletError(kind: WalletErrorKind, details?: Record<string, unknown>): WalletError {
  const err = new ApplicationError(WALLET_ERRORS[kind], details as never) as unknown as WalletError;
  err.kind = kind;
  return err;
}

function kindOf(err: unknown): WalletErrorKind | null {
  const kind = (err as { kind?: WalletErrorKind } | null)?.kind;
  return kind && kind in WALLET_ERRORS ? kind : null;
}

export function httpStatusFor(err: unknown): number {
  const kind = kindOf(err);
  return kind ? STATUS_BY_KIND[kind] : 500;
}

/** Безопасное сообщение для клиента: внутренние тексты не прокидываются. */
export function publicMessageFor(err: unknown, fallback: string): string {
  const kind = kindOf(err);
  return kind ? WALLET_ERRORS[kind] : fallback;
}

export function isWalletError(err: unknown): boolean {
  return kindOf(err) !== null;
}
