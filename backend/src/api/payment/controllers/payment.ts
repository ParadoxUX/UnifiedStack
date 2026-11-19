/**
 * Webhook платёжного провайдера.
 *
 * Единственный легальный путь зачисления средств на кошелёк. Публичный
 * /api/wallets/deposit закрыт: баланс не может пополняться самим клиентом.
 *
 * Защита:
 *  1) HMAC-SHA256 подпись тела запроса секретом PAYMENT_WEBHOOK_SECRET
 *     (заголовок x-payment-signature: sha256=<hex>);
 *  2) idempotency key провайдера в заголовке x-payment-event-id —
 *     используется как reference транзакции, повтор того же события
 *     возвращает ранее созданный результат без повторного начисления.
 */

import { createHmac, timingSafeEqual } from 'crypto';
import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { walletService } from '../../../services/wallet';

const { ApplicationError } = errors;

function verifySignature(rawBody: string, signature: unknown, secret: string): boolean {
  if (typeof signature !== 'string' || !signature.startsWith('sha256=')) return false;

  const provided = signature.slice(7).toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(provided)) return false;

  const expected = createHmac('sha256', secret).update(rawBody).digest('hex');
  const a = Buffer.from(provided, 'utf8');
  const b = Buffer.from(expected, 'utf8');
  return a.length === b.length && timingSafeEqual(a, b);
}

export default {
  async webhook(ctx: any) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret) {
      // Fail closed: без секрета webhook не работает, а не "пропускает всех".
      return ctx.throw(503, 'Платёжный webhook не настроен');
    }

    const headers = ctx.request.headers as Record<string, unknown>;
    const eventId = headers['x-payment-event-id'];
    const signature = headers['x-payment-signature'];
    const rawBody = (ctx.request as any).rawBody ?? JSON.stringify(ctx.request.body ?? {});

    if (!verifySignature(String(rawBody), signature, secret)) {
      ctx.throw(401, 'Неверная подпись платежа');
    }
    if (typeof eventId !== 'string' || !/^[A-Za-z0-9_.:-]{8,128}$/.test(eventId)) {
      ctx.throw(400, 'Некорректный x-payment-event-id');
    }

    const { userId, amount } = ctx.request.body ?? {};
    const parsedUserId = Number(userId);
    const parsedAmount = Number(amount);

    if (!Number.isInteger(parsedUserId) || parsedUserId <= 0) {
      ctx.throw(400, 'userId должен быть положительным целым числом');
    }
    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0 || parsedAmount > 1_000_000) {
      ctx.throw(400, 'amount должен быть целым числом от 1 до 1 000 000');
    }

    try {
      const result = await walletService.deposit((strapi as Core.Strapi), {
        userId: parsedUserId,
        amount: parsedAmount,
        // Провайдерский event id — идемпотентный ключ. walletService.deposit
        // возвращает существующую транзакцию, если reference уже использован.
        reference: `payment_${eventId}`,
      });
      ctx.body = { data: result, idempotent: Boolean((result as any).idempotent) };
    } catch (err: any) {
      if (err instanceof ApplicationError) {
        ctx.throw(400, err.message);
      }
      ctx.throw(500, 'Ошибка зачисления платежа');
    }
  },
};
