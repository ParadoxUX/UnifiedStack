/**
 * Rate limit на создание тикетов поддержки.
 *
 * Подключается как route-middleware для POST /api/support-tickets,
 * поэтому выполняется уже после auth/authorize: ctx.state.user доступен.
 *
 * Настройки (env):
 *   SUPPORT_TICKET_RATE_LIMIT      — сколько тикетов можно создать за окно (по умолчанию 5)
 *   SUPPORT_TICKET_RATE_WINDOW_MS  — размер окна в миллисекундах (по умолчанию 10 минут)
 */

import type { Core } from '@strapi/strapi';

const DEFAULT_LIMIT = 5;
const DEFAULT_WINDOW_MS = 10 * 60 * 1000;

const hits = new Map<string, number[]>();

function readPositiveInt(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}

export default (config: unknown, { strapi }: { strapi: Core.Strapi }) => {
  const limit = readPositiveInt(process.env.SUPPORT_TICKET_RATE_LIMIT, DEFAULT_LIMIT);
  const windowMs = readPositiveInt(process.env.SUPPORT_TICKET_RATE_WINDOW_MS, DEFAULT_WINDOW_MS);

  return async (ctx: any, next: () => Promise<void>) => {
    const user = ctx.state?.user;
    const key = user?.id ? `user:${user.id}` : `ip:${ctx.ip}`;

    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((at) => now - at < windowMs);

    if (recent.length >= limit) {
      const retryAfter = Math.max(1, Math.ceil((windowMs - (now - recent[0])) / 1000));
      ctx.set('Retry-After', String(retryAfter));
      strapi.log.warn(`[support] rate limit для ${key}: ${recent.length}/${limit}`);
      return ctx.throw(
        429,
        `Слишком много тикетов. Повторите через ${Math.ceil(retryAfter / 60)} мин.`
      );
    }

    recent.push(now);
    hits.set(key, recent);

    // Периодическая уборка, чтобы карта не росла бесконечно.
    if (hits.size > 5000) {
      for (const [entryKey, timestamps] of hits) {
        if (!timestamps.some((at) => now - at < windowMs)) hits.delete(entryKey);
      }
    }

    return next();
  };
};
