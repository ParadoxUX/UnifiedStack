/**
 * wallet service
 *
 * Ядро денежной логики. Все операции записи выполняются в одной транзакции БД
 * с блокировкой строки кошелька:
 *   - PostgreSQL: SELECT ... FOR UPDATE;
 *   - SQLite/MySQL: очередь операций по кошельку в процессе + CAS по balance.
 *
 * Дополнительно ограничения продублированы в БД (см. migrations/wallet-constraints.ts):
 * UNIQUE transactions.reference, UNIQUE wallets.user,
 * UNIQUE library_items(wallet_id, game_id), CHECK (balance >= 0).
 * Поэтому поведение одинаково на PostgreSQL и SQLite.
 */

import type { Core } from '@strapi/strapi';
import { walletError } from '../utils/wallet-errors';

export type TxType = 'deposit' | 'withdraw' | 'purchase' | 'refund';

export interface WalletRow {
  id: number;
  balance: number;
}

interface PurchaseArgs {
  userId: number | string;
  gameId: string;
  reference: string;
}

const POCKET_POINTS_PER_PURCHASE = 50;

function isPostgres(strapi: Core.Strapi): boolean {
  const configured = String(strapi.config.get('database.connection.client') ?? '').toLowerCase();
  const knexClient = String((strapi.db.connection as any)?.client?.config?.client ?? '').toLowerCase();
  const client = configured || knexClient;
  return client.includes('postgres') || client === 'pg';
}

/**
 * Нарушение UNIQUE в разных драйверах выглядит по-разному.
 */
function isUniqueViolation(err: any): boolean {
  const code = String(err?.code ?? '');
  const message = String(err?.message ?? '');
  return (
    code === '23505' ||
    code === 'SQLITE_CONSTRAINT_UNIQUE' ||
    code === 'SQLITE_CONSTRAINT_PRIMARYKEY' ||
    Number(err?.errno) === 1062 ||
    /UNIQUE constraint failed|duplicate key value|ER_DUP_ENTRY/i.test(message)
  );
}

const REFERENCE_CONFLICT = 'UNIQUE_REFERENCE';

function referenceConflictError(): Error {
  const err: any = walletError('referenceConflict');
  err.code = REFERENCE_CONFLICT;
  return err;
}

function isReferenceConflict(err: any): boolean {
  return err?.code === REFERENCE_CONFLICT || isUniqueViolation(err);
}

/**
 * Очередь операций по кошельку для не-PostgreSQL клиентов.
 *
 * В PostgreSQL конкурентные транзакции сериализует SELECT ... FOR UPDATE.
 * SQLite не умеет блокировать строку, поэтому в пределах процесса выстраиваем
 * операции одного кошелька в очередь — результат совпадает с PostgreSQL.
 */
const walletQueues = new Map<string, Promise<unknown>>();

function serializeWallet<T>(key: string, task: () => Promise<T>): Promise<T> {
  const previous = walletQueues.get(key) ?? Promise.resolve();
  const next = previous.then(task, task);
  walletQueues.set(key, next);

  const cleanup = () => {
    if (walletQueues.get(key) === next) walletQueues.delete(key);
  };
  next.then(cleanup, cleanup);

  return next;
}

/**
 * Гарантирует наличие кошелька у пользователя. Идемпотентно.
 */
async function ensureWallet(strapi: Core.Strapi, userId: number | string) {
  const query = strapi.db.query('api::wallet.wallet');
  const existing = await query.findOne({
    where: { user: { id: userId } },
  });
  if (existing) return existing;

  try {
    return await query.create({
      data: {
        user: userId,
        balance: 0,
        currency: 'RUB',
      },
    });
  } catch (err) {
    // Параллельный запрос уже создал кошелёк (UNIQUE wallets_user_lnk.user_id).
    if (isUniqueViolation(err)) {
      const concurrent = await query.findOne({ where: { user: { id: userId } } });
      if (concurrent) return concurrent;
    }
    throw err;
  }
}

/**
 * Блокирующая выборка кошелька внутри транзакции.
 * Postgres: SELECT ... FOR UPDATE. Иначе — обычная выборка.
 */
async function lockWallet(
  strapi: Core.Strapi,
  trx: any,
  walletId: number
): Promise<WalletRow> {
  // Strapi передаёт в колбэк транзакции сам knex-транзакшен (не объект с getKnex).
  const knex = trx ?? (strapi.db.connection as any);

  if (isPostgres(strapi)) {
    const res = await knex.raw('SELECT id, balance FROM wallets WHERE id = ? FOR UPDATE', [
      walletId,
    ]);
    const row = res?.rows?.[0] ?? res?.[0]?.[0];
    if (!row) throw walletError('walletMissing', { walletId });
    return { id: Number(row.id), balance: Number(row.balance) };
  }

  const wallet = await knex('wallets').where({ id: walletId }).first();
  if (!wallet) throw walletError('walletMissing', { walletId });
  return { id: Number(wallet.id), balance: Number(wallet.balance ?? 0) };
}

/**
 * Запись транзакции в журнал. reference уникален.
 */
async function recordTransaction(
  strapi: Core.Strapi,
  data: {
    walletId: number;
    type: TxType;
    amount: number;
    balanceBefore: number;
    balanceAfter: number;
    reference: string;
    gameId?: string | number | null;
    metadata?: Record<string, unknown>;
    status?: 'pending' | 'completed' | 'failed' | 'reversed';
  }
) {
  const duplicate = await strapi.db.query('api::transaction.transaction').findOne({
    where: { reference: data.reference },
  });
  if (duplicate) {
    throw referenceConflictError();
  }

  try {
    return await strapi.db.query('api::transaction.transaction').create({
      data: {
        wallet: data.walletId,
        type: data.type,
        amount: data.amount,
        balanceBefore: data.balanceBefore,
        balanceAfter: data.balanceAfter,
        status: data.status ?? 'completed',
        reference: data.reference,
        game: data.gameId ?? null,
        metadata: data.metadata ?? {},
      },
    });
  } catch (err) {
    // Гонка двух запросов с одинаковым reference: UNIQUE transactions.reference.
    if (isUniqueViolation(err)) {
      throw referenceConflictError();
    }
    throw err;
  }
}

/**
 * Универсальное движение средств.
 */
async function performMove(
  strapi: Core.Strapi,
  trx: any,
  params: {
    type: TxType;
    reference: string;
    gameId?: string | number | null;
    metadata?: Record<string, unknown>;
    guard?: (trx: any, wallet: WalletRow) => Promise<void>;
    extra?: (trx: any, walletId: number) => Promise<Record<string, unknown> | void>;
  },
  locked: WalletRow,
  signedAmount: number
) {
  if (params.guard) {
    await params.guard(trx, locked);
  }

  const before = locked.balance;
  const after = before + signedAmount;

  if (after < 0) {
    strapi.log.info(`[wallet] недостаточно средств: walletId=${locked.id} balance=${before} amount=${Math.abs(signedAmount)}`);
    throw walletError('insufficientFunds', { walletId: locked.id });
  }

  // Условное обновление: сработает только если баланс не изменился
  // между выборкой и апдейтом (защита от гонок вне Postgres).
  const updated = await strapi.db
    .query('api::wallet.wallet')
    .updateMany({
      where: { id: locked.id, balance: before },
      data: { balance: after },
    });

  if (!updated || updated.count === 0) {
    throw walletError('balanceConflict', { walletId: locked.id });
  }

  const extraResult = params.extra ? await params.extra(trx, locked.id) : undefined;

  const transaction = await recordTransaction(strapi, {
    walletId: locked.id,
    type: params.type,
    amount: signedAmount,
    balanceBefore: before,
    balanceAfter: after,
    reference: params.reference,
    gameId: params.gameId ?? null,
    metadata: params.metadata,
  });

  return {
    balance: after,
    walletId: locked.id,
    transaction,
    ...(extraResult ?? {}),
  };
}

async function move(
  strapi: Core.Strapi,
  params: {
    userId: number | string;
    type: TxType;
    amount: number;
    reference: string;
    gameId?: string | number | null;
    metadata?: Record<string, unknown>;
    guard?: (trx: any, wallet: WalletRow) => Promise<void>;
    extra?: (trx: any, walletId: number) => Promise<Record<string, unknown> | void>;
    /**
     * Позволяет пересчитать сумму внутри транзакции, непосредственно перед
     * списанием (например, взять актуальную цену игры из БД).
     */
    resolveAmount?: (
      trx: any
    ) => Promise<{ amount: number; metadata?: Record<string, unknown> }>;
  }
) {
  const toSigned = (amount: number) =>
    params.type === 'withdraw' || params.type === 'purchase'
      ? -Math.abs(amount)
      : Math.abs(amount);

  const applyMove = async (trx: any, locked: WalletRow) => {
    let amount = params.amount;
    let metadata = params.metadata;

    if (params.resolveAmount) {
      const resolved = await params.resolveAmount(trx);
      amount = resolved.amount;
      metadata = resolved.metadata ?? metadata;
    }

    return performMove(strapi, trx, { ...params, metadata }, locked, toSigned(amount));
  };

  if (isPostgres(strapi)) {
    const wallet = await ensureWallet(strapi, params.userId);
    return strapi.db.transaction(async ({ trx }) => {
      const locked = await lockWallet(strapi, trx, Number(wallet.id));
      return applyMove(trx, locked);
    });
  }

  // SQLite/MySQL: очередь по кошельку. Внутри транзакции нельзя делать
  // запросы мимо trx — пул соединений SQLite равен 1, иначе будет дедлок.
  return serializeWallet(`user:${params.userId}`, async () => {
    const wallet = await ensureWallet(strapi, params.userId);
    return strapi.db.transaction(async ({ trx }) => {
      const locked = await lockWallet(strapi, trx, Number(wallet.id));
      return applyMove(trx, locked);
    });
  });
}

/**
 * Пополнение баланса.
 */
async function deposit(
  strapi: Core.Strapi,
  args: { userId: number | string; amount: number; reference: string }
) {
  const wallet = await ensureWallet(strapi, args.userId);
  const existing = await strapi.db.query('api::transaction.transaction').findOne({
    where: { reference: args.reference },
  });
  if (existing) {
    return {
      balance: wallet.balance,
      walletId: wallet.id,
      transaction: existing,
      idempotent: true,
    };
  }

  try {
    return await move(strapi, {
      userId: args.userId,
      type: 'deposit',
      amount: args.amount,
      reference: args.reference,
      metadata: { channel: 'manual' },
    });
  } catch (err) {
    // Гонка параллельных пополнений с одинаковым reference:
    // UNIQUE transactions.reference не дал начислить дважды — отдаём идемпотентный ответ.
    if (isReferenceConflict(err)) {
      const concurrent = await strapi.db.query('api::transaction.transaction').findOne({
        where: { reference: args.reference },
      });
      const fresh = await ensureWallet(strapi, args.userId);
      if (concurrent) {
        return {
          balance: fresh.balance,
          walletId: fresh.id,
          transaction: concurrent,
          idempotent: true,
        };
      }
    }
    throw err;
  }
}

/**
 * Списание средств.
 */
async function withdraw(
  strapi: Core.Strapi,
  args: { userId: number | string; amount: number; reference: string }
) {
  return move(strapi, {
    userId: args.userId,
    type: 'withdraw',
    amount: args.amount,
    reference: args.reference,
  });
}

/**
 * Покупка игры.
 */
async function purchaseGame(strapi: Core.Strapi, args: PurchaseArgs) {
  const wallet = await ensureWallet(strapi, args.userId);

  const game = await strapi.db.query('api::game.game').findOne({
    where: { $or: [{ documentId: args.gameId }, { id: Number(args.gameId) || -1 }] },
  });
  if (!game) throw walletError('gameMissing', { gameId: args.gameId });
  if (game.purchasable === false) {
    throw walletError('gameUnavailable', { gameId: args.gameId });
  }

  const existingTx = await strapi.db.query('api::transaction.transaction').findOne({
    where: { reference: args.reference },
  });
  if (existingTx) {
    return { balance: wallet.balance, transaction: existingTx, game, idempotent: true };
  }

  // Цена, которая реально спишется. Заполняется в resolveAmount внутри
  // транзакции и используется для записи в библиотеку — значения не расходятся.
  let chargedPrice = Number(game.Price ?? 0);

  // Проверка владения выполняется внутри транзакции, после блокировки кошелька.
  // На PostgreSQL это FOR UPDATE, на SQLite — очередь операций по кошельку.
  const result = await move(strapi, {
    userId: args.userId,
    type: 'purchase',
    // Сумма не берётся с клиента: resolveAmount читает цену из БД
    // непосредственно перед списанием, уже внутри транзакции.
    amount: 0,
    reference: args.reference,
    gameId: game.id,
    resolveAmount: async (trx) => {
      // Читаем цену через транзакцию: это то же соединение, что и списание.
      const knex = trx ?? (strapi.db.connection as any);
      const fresh = await knex('games').where({ id: game.id }).first();
      if (!fresh) throw walletError('gameMissing', { gameId: args.gameId });
      if (fresh.purchasable === false || fresh.purchasable === 0) {
        throw walletError('gameUnavailable', { gameId: args.gameId });
      }

      const freshPrice = Number(fresh.price ?? 0);
      if (!Number.isFinite(freshPrice) || freshPrice < 0) {
        throw walletError('invalidInput', { gameId: args.gameId });
      }

      chargedPrice = freshPrice;

      return {
        amount: freshPrice,
        metadata:
          freshPrice === 0
            ? { free: true, title: fresh.title }
            : { title: fresh.title, price: freshPrice },
      };
    },
    guard: async (_trx, locked) => {
      const owned = await strapi.db
        .query('api::library-item.library-item')
        .findOne({
          where: {
            wallet: { id: locked.id },
            game: { id: game.id },
            status: { $ne: 'refunded' },
          },
        });
      if (owned) throw walletError('alreadyOwned', { gameId: args.gameId });
    },
    extra: async (trx, walletId) => {
      const item = await createLibraryItem(strapi, walletId, game, chargedPrice);
      await bumpGameStatus(strapi, trx, game);
      return { libraryItem: item, game };
    },
  });

  return result;
}

/**
 * Создание (или повторное открытие после возврата) записи в библиотеке.
 *
 * walletId/gameId — денормализованные ключи для UNIQUE (wallet_id, game_id):
 * Strapi v5 хранит связи в link-таблицах, поэтому уникальность пары
 * обеспечивается отдельным индексом на library_items.
 */
async function createLibraryItem(strapi: Core.Strapi, walletId: number, game: any, price: number) {
  const query = strapi.db.query('api::library-item.library-item');

  const existing = await query.findOne({
    where: { wallet: { id: walletId }, game: { id: game.id } },
  });

  if (existing) {
    // Игра была возвращена ранее — открываем её заново, не создавая дубль.
    return query.update({
      where: { id: existing.id },
      data: {
        status: 'owned',
        pricePaid: price,
        purchasedAt: new Date(),
        walletId,
        gameId: game.id,
      },
    });
  }

  return query.create({
    data: {
      wallet: walletId,
      game: game.id,
      status: 'owned',
      pricePaid: price,
      purchasedAt: new Date(),
      walletId,
      gameId: game.id,
    },
  });
}

/**
 * Обновление статуса игры после покупки:
 *  - счётчик покупок;
 *  - дата последней покупки;
 *  - если у игры ограниченный тираж (stock), уменьшаем и блокируем при нуле.
 *
 * Используются атомарные UPDATE (purchase_count + 1, stock - 1), чтобы
 * параллельные покупки разными пользователями не теряли обновления.
 */
async function bumpGameStatus(strapi: Core.Strapi, trx: any, game: any) {
  // trx — это knex-транзакшен Strapi; запросы обязаны идти через него.
  const knex = trx ?? (strapi.db.connection as any);

  await knex('games')
    .where({ id: game.id })
    .update({
      purchase_count: knex.raw('COALESCE(purchase_count, 0) + 1'),
      last_purchased_at: new Date(),
    });

  if (typeof game.stock === 'number') {
    await knex('games').where({ id: game.id }).andWhere('stock', '>', 0).decrement('stock', 1);
    await knex('games')
      .where({ id: game.id })
      .andWhere('stock', '<=', 0)
      .update({ purchasable: false });
  }
}

/**
 * Возврат (откат) транзакции.
 */
async function reverseTransaction(
  strapi: Core.Strapi,
  reference: string,
  userId: number | string
) {
  const precheck = await strapi.db.query('api::transaction.transaction').findOne({
    where: { reference },
    populate: { wallet: { populate: ['user'] } },
  });
  if (!precheck) throw walletError('transactionMissing', { reference });

  const preOwnerId = precheck.wallet?.user?.id;
  if (String(preOwnerId) !== String(userId)) {
    throw walletError('forbidden', { reference });
  }

  const walletId = precheck.wallet?.id;
  if (!walletId) throw walletError('walletMissing', { reference });

  const run = () =>
    strapi.db.transaction(async ({ trx }) => {
      // Повторное чтение внутри транзакции после блокировки кошелька (T-02)
      const locked = await lockWallet(strapi, trx, Number(walletId));

      const original = await strapi.db.query('api::transaction.transaction').findOne({
        where: { reference },
        populate: { wallet: { populate: ['user'] }, game: true },
      });
      if (!original) throw walletError('transactionMissing', { reference });

      const ownerId = original.wallet?.user?.id;
      if (String(ownerId) !== String(userId)) {
        throw walletError('forbidden', { reference });
      }
      if (original.status === 'reversed') {
        throw walletError('alreadyReversed', { reference });
      }

      const refund = Math.abs(Number(original.amount));
      const after = locked.balance + refund;

      const updated = await strapi.db
        .query('api::wallet.wallet')
        .updateMany({
          where: { id: locked.id, balance: locked.balance },
          data: { balance: after },
        });
      if (!updated || updated.count === 0) {
        throw walletError('balanceConflict', { walletId: locked.id });
      }

      // Атомарный захват статуса: второй параллельный reverse получит count === 0
      const claim = await strapi.db.query('api::transaction.transaction').updateMany({
        where: { id: original.id, status: original.status },
        data: { status: 'reversed' },
      });
      if (!claim || claim.count === 0) {
        throw walletError('alreadyReversed', { reference });
      }

      // Детерминированный reference компенсации исключает повторную запись
      await recordTransaction(strapi, {
        walletId: locked.id,
        type: 'refund',
        amount: refund,
        balanceBefore: locked.balance,
        balanceAfter: after,
        reference: `${reference}_refund`,
        gameId: original.game?.id ?? null,
        metadata: { reversedReference: reference },
      });

      if (original.game?.id) {
        const item = await strapi.db.query('api::library-item.library-item').findOne({
          where: { wallet: { id: locked.id }, game: { id: original.game.id } },
        });
        if (item) {
          await strapi.db.query('api::library-item.library-item').update({
            where: { id: item.id },
            data: { status: 'refunded' },
          });
        }
      }

      return { balance: after, reversed: reference };
    });

  if (isPostgres(strapi)) return run();

  return serializeWallet(`wallet:${walletId}`, run);
}

/**
 * Библиотека пользователя.
 */
async function getLibrary(strapi: Core.Strapi, userId: number | string, includeGame = true) {
  const wallet = await ensureWallet(strapi, userId);
  return strapi.db.query('api::library-item.library-item').findMany({
    where: { wallet: { id: wallet.id } },
    populate: includeGame ? { game: true } : {},
    orderBy: { purchasedAt: 'desc' },
  });
}

export const walletService = {
  ensureWallet,
  move,
  deposit,
  withdraw,
  purchaseGame,
  reverseTransaction,
  getLibrary,
  recordTransaction,
  POCKET_POINTS_PER_PURCHASE,
};

export default walletService;