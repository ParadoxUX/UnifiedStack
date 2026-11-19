/**
 * wallet controller — денежные операции с типизированными HTTP-ошибками.
 * Публичное пополнение закрыто (T-03): зачисление только через /api/payments/webhook.
 */

import { walletService } from '../../../services/wallet';
import {
  httpStatusFor,
  isWalletError,
  publicMessageFor,
  walletError,
} from '../../../utils/wallet-errors';
import { cloudService } from '../../../services/cloud';

function requireUser(ctx: any) {
  const user = ctx.state.user;
  if (!user) ctx.throw(401, 'Требуется авторизация');
  return user;
}

function fail(ctx: any, err: unknown, fallback: string) {
  const status = httpStatusFor(err);
  const message = publicMessageFor(err, fallback);
  if (!isWalletError(err)) {
    strapi.log.error(`[wallet] ${fallback}`, err);
  }
  ctx.throw(status, message);
}

export default {
  async me(ctx: any) {
    const user = requireUser(ctx);
    const wallet = await walletService.ensureWallet(strapi, user.id);
    const transactions = await strapi.db.query('api::transaction.transaction').findMany({
      where: { wallet: { id: wallet.id } },
      orderBy: { createdAt: 'desc' },
      limit: 50,
    });
    ctx.body = { data: { ...wallet, transactions } };
  },

  async withdraw(ctx: any) {
    const user = requireUser(ctx);
    const { amount, reference } = ctx.request.body ?? {};
    const parsed = Number(amount);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      fail(ctx, walletError('invalidInput', { field: 'amount' }), 'Некорректная сумма списания');
      return;
    }

    try {
      const result = await walletService.withdraw(strapi, {
        userId: user.id,
        amount: parsed,
        reference: reference || `withdraw_${user.id}_${Date.now()}`,
      });
      ctx.body = { data: result };
    } catch (err) {
      fail(ctx, err, 'Не удалось выполнить списание');
    }
  },

  async purchase(ctx: any) {
    const user = requireUser(ctx);
    const { gameId, reference } = ctx.request.body ?? {};
    if (
      !gameId ||
      (typeof gameId !== 'number' && typeof gameId !== 'string') ||
      (typeof gameId === 'string' && gameId.trim() === '')
    ) {
      fail(ctx, walletError('invalidInput', { field: 'gameId' }), 'Некорректный gameId');
      return;
    }

    try {
      const result = await walletService.purchaseGame(strapi, {
        userId: user.id,
        gameId: String(gameId).trim(),
        reference: reference || `purchase_${user.id}_${gameId}_${Date.now()}`,
      });
      ctx.body = { data: result };
    } catch (err) {
      fail(ctx, err, 'Не удалось выполнить покупку');
    }
  },

  async purchaseDlc(ctx: any) {
    const user = requireUser(ctx);
    const { dlcId, reference } = ctx.request.body ?? {};
    if (!dlcId || (typeof dlcId !== 'number' && typeof dlcId !== 'string') || String(dlcId).trim() === '') {
      fail(ctx, walletError('invalidInput', { field: 'dlcId' }), 'Некорректный dlcId');
      return;
    }

    try {
      const result = await walletService.purchaseDlc(strapi, {
        userId: user.id,
        dlcId: String(dlcId).trim(),
        reference: reference || `dlc_${user.id}_${dlcId}_${Date.now()}`,
      });
      ctx.body = { data: result };
    } catch (err) {
      fail(ctx, err, 'Ошибка покупки дополнения');
    }
  },

  async cloudStart(ctx: any) {
    const user = requireUser(ctx);
    const { tariffId, minutes, server, kind } = ctx.request.body ?? {};
    if (!tariffId) ctx.throw(400, 'tariffId обязателен');

    try {
      const result = await cloudService.startSession(strapi, {
        userId: user.id,
        tariffId: String(tariffId),
        minutes: Number(minutes) || 60,
        server: String(server || 'EU-Central'),
        kind: kind === 'account' ? 'account' : 'timed',
      });
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.throw(400, err?.message || 'Не удалось запустить сессию');
    }
  },

  async cloudActive(ctx: any) {
    const user = requireUser(ctx);
    const session = await cloudService.activeSession(strapi, user.id);
    ctx.body = { data: { session, accountPrice: cloudService.ACCOUNT_PRICE } };
  },

  async cloudStop(ctx: any) {
    const user = requireUser(ctx);
    try {
      const result = await cloudService.stopSession(strapi, user.id);
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.throw(400, err?.message || 'Не удалось остановить сессию');
    }
  },

  async cloudHistory(ctx: any) {
    const user = requireUser(ctx);
    ctx.body = { data: await cloudService.history(strapi, user.id) };
  },

  async cloudGame(ctx: any) {
    const user = requireUser(ctx);
    const { gameId } = ctx.request.body ?? {};
    if (!gameId) ctx.throw(400, 'gameId обязателен');
    try {
      ctx.body = { data: await cloudService.selectGame(strapi, user.id, String(gameId)) };
    } catch (err: any) {
      ctx.throw(400, err?.message || 'Не удалось выбрать игру');
    }
  },

  async library(ctx: any) {
    const user = requireUser(ctx);
    const items = await walletService.getLibrary(strapi, user.id, true);
    ctx.body = { data: items };
  },

  async reverse(ctx: any) {
    const user = requireUser(ctx);
    const { reference } = ctx.request.body ?? {};
    if (!reference || typeof reference !== 'string' || !reference.trim()) {
      fail(ctx, walletError('invalidInput', { field: 'reference' }), 'Некорректный reference');
      return;
    }

    try {
      const result = await walletService.reverseTransaction(strapi, reference.trim(), user.id);
      ctx.body = { data: result };
    } catch (err) {
      fail(ctx, err, 'Не удалось выполнить возврат');
    }
  },
};
