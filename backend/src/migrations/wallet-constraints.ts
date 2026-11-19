/**
 * Миграция денежных гарантий: одинаковые ограничения на PostgreSQL и SQLite.
 *
 * Выполняется при старте Strapi (bootstrap) и идемпотентна.
 *
 * Strapi v5 хранит связи (wallets.user, library_items.wallet/game) в link-таблицах,
 * поэтому ограничения накладываются на реальные таблицы и колонки:
 *
 *   - UNIQUE transactions.reference          → transactions_reference_unique;
 *   - UNIQUE wallets.user                    → wallets_user_lnk_user_unique (user_id);
 *   - UNIQUE library_items(wallet_id, game_id)→ library_items_wallet_game_unique
 *     (денормализованные колонки wallet_id/game_id заполняются сервисом кошелька);
 *   - CHECK (balance >= 0)                   → PostgreSQL: CHECK-constraint,
 *                                              SQLite: BEFORE INSERT/UPDATE триггеры.
 *
 * Если данные уже нарушают ограничения, миграция падает с понятной ошибкой.
 * Никаких «молчаливых» continue: невыполненная гарантия = остановка старта.
 */

import type { Core } from '@strapi/strapi';

type DbKind = 'postgres' | 'sqlite' | 'mysql';

const BALANCE_CONSTRAINT = 'wallets_balance_non_negative';

function detectClient(strapi: Core.Strapi): DbKind {
  const configured = String(strapi.config.get('database.connection.client') ?? '').toLowerCase();
  const knexClient = String(
    (strapi.db.connection as any)?.client?.config?.client ?? ''
  ).toLowerCase();
  const client = configured || knexClient;
  if (client.includes('postgres') || client === 'pg') return 'postgres';
  if (client.includes('sqlite')) return 'sqlite';
  return 'mysql';
}

/** knex.raw возвращает разные структуры в pg и sqlite. */
function resultRows(res: any): any[] {
  if (!res) return [];
  if (Array.isArray(res)) return Array.isArray(res[0]) ? res[0] : res;
  if (Array.isArray(res.rows)) return res.rows;
  return [];
}

function isDuplicateObjectError(err: any, kind: DbKind): boolean {
  const code = String(err?.code ?? '');
  if (kind === 'postgres') return code === '42P07' || code === '42710';
  if (kind === 'sqlite') return /already exists/i.test(String(err?.message ?? ''));
  return code === 'ER_DUP_KEYNAME' || Number(err?.errno) === 1061;
}

function isCheckViolation(err: any, kind: DbKind): boolean {
  if (kind === 'postgres') return String(err?.code ?? '') === '23514';
  return /CHECK constraint failed/i.test(String(err?.message ?? ''));
}

function formatRows(rows: any[]): string {
  return JSON.stringify(rows.slice(0, 5));
}

/**
 * Заполняет денормализованные wallet_id/game_id из link-таблиц Strapi.
 * Нужно для уже существующих записей библиотеки.
 */
async function backfillLibraryKeys(strapi: Core.Strapi, knex: any): Promise<void> {
  try {
    await knex.raw(
      `UPDATE library_items
         SET wallet_id = (
           SELECT l.wallet_id FROM library_items_wallet_lnk l
           WHERE l.library_item_id = library_items.id LIMIT 1
         )
       WHERE wallet_id IS NULL`
    );
    await knex.raw(
      `UPDATE library_items
         SET game_id = (
           SELECT l.game_id FROM library_items_game_lnk l
           WHERE l.library_item_id = library_items.id LIMIT 1
         )
       WHERE game_id IS NULL`
    );
  } catch (err: any) {
    throw new Error(
      `[wallet] Не удалось заполнить library_items.wallet_id/game_id: ${err?.message ?? err}`
    );
  }
}

/**
 * Проверяет, что существующие данные не нарушают будущие ограничения.
 * Падает до создания индексов, чтобы сообщение было понятным.
 */
async function assertDataIsClean(strapi: Core.Strapi, knex: any): Promise<void> {
  const problems: string[] = [];

  const negative = resultRows(
    await knex.raw('SELECT id, balance FROM wallets WHERE balance < 0')
  );
  if (negative.length) {
    problems.push(`отрицательный баланс wallets (исправьте вручную): ${formatRows(negative)}`);
  }

  const duplicateRefs = resultRows(
    await knex.raw(
      `SELECT reference, COUNT(*) AS c FROM transactions
       WHERE reference IS NOT NULL
       GROUP BY reference HAVING COUNT(*) > 1`
    )
  );
  if (duplicateRefs.length) {
    problems.push(`дубли transactions.reference: ${formatRows(duplicateRefs)}`);
  }

  const duplicateOwnership = resultRows(
    await knex.raw(
      `SELECT wallet_id, game_id, COUNT(*) AS c FROM library_items
       WHERE wallet_id IS NOT NULL AND game_id IS NOT NULL
       GROUP BY wallet_id, game_id HAVING COUNT(*) > 1`
    )
  );
  if (duplicateOwnership.length) {
    problems.push(`дубли library_items(wallet_id, game_id): ${formatRows(duplicateOwnership)}`);
  }

  const duplicateWallets = resultRows(
    await knex.raw(
      `SELECT user_id, COUNT(*) AS c FROM wallets_user_lnk
       WHERE user_id IS NOT NULL
       GROUP BY user_id HAVING COUNT(*) > 1`
    )
  );
  if (duplicateWallets.length) {
    problems.push(`у пользователя несколько кошельков (wallets_user_lnk.user_id): ${formatRows(duplicateWallets)}`);
  }

  if (problems.length) {
    throw new Error(
      '[wallet] Данные нарушают денежные ограничения, старт остановлен:\n - ' +
        problems.join('\n - ')
    );
  }
}

async function ensureBalanceConstraint(
  strapi: Core.Strapi,
  knex: any,
  kind: DbKind
): Promise<void> {
  if (kind === 'sqlite') {
    // SQLite не умеет ALTER TABLE ADD CONSTRAINT — используем триггеры.
    await knex.raw(
      `CREATE TRIGGER IF NOT EXISTS wallets_balance_non_negative_insert
         BEFORE INSERT ON wallets
         FOR EACH ROW WHEN NEW.balance < 0
         BEGIN SELECT RAISE(ABORT, 'wallets.balance must be >= 0'); END`
    );
    await knex.raw(
      `CREATE TRIGGER IF NOT EXISTS wallets_balance_non_negative_update
         BEFORE UPDATE OF balance ON wallets
         FOR EACH ROW WHEN NEW.balance < 0
         BEGIN SELECT RAISE(ABORT, 'wallets.balance must be >= 0'); END`
    );
    return;
  }

  if (kind === 'postgres') {
    const exists = resultRows(
      await knex.raw('SELECT 1 FROM pg_constraint WHERE conname = ?', [BALANCE_CONSTRAINT])
    );
    if (exists.length) return;

    try {
      await knex.raw(
        `ALTER TABLE wallets ADD CONSTRAINT ${BALANCE_CONSTRAINT} CHECK (balance >= 0)`
      );
    } catch (err: any) {
      if (isCheckViolation(err, kind)) {
        throw new Error(
          '[wallet] Нельзя включить CHECK (balance >= 0): в wallets есть отрицательные балансы. ' +
            'Исправьте данные и перезапустите Strapi.'
        );
      }
      throw err;
    }
    return;
  }

  // MySQL 8.0.16+ умеет CHECK; повторное добавление игнорируем.
  try {
    await knex.raw(
      `ALTER TABLE wallets ADD CONSTRAINT ${BALANCE_CONSTRAINT} CHECK (balance >= 0)`
    );
  } catch (err: any) {
    if (!/duplicate/i.test(String(err?.message ?? ''))) throw err;
  }
}

function indexStatements(kind: DbKind): string[] {
  const statements = [
    `CREATE UNIQUE INDEX IF NOT EXISTS transactions_reference_unique ON transactions (reference)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS wallets_user_lnk_user_unique ON wallets_user_lnk (user_id)`,
    `CREATE INDEX IF NOT EXISTS games_purchasable_idx ON games (purchasable)`,
  ];

  if (kind === 'mysql') {
    // MySQL не поддерживает partial index, но NULL-ы в UNIQUE не конфликтуют.
    statements.push(
      `CREATE UNIQUE INDEX library_items_wallet_game_unique ON library_items (wallet_id, game_id)`
    );
  } else {
    statements.push(
      `CREATE UNIQUE INDEX IF NOT EXISTS library_items_wallet_game_unique
         ON library_items (wallet_id, game_id)
         WHERE wallet_id IS NOT NULL AND game_id IS NOT NULL`
    );
  }

  return statements;
}

export async function runWalletMigration(strapi: Core.Strapi): Promise<void> {
  const knex = strapi.db.connection as any;
  const kind = detectClient(strapi);

  strapi.log.info(`[wallet] Проверка ограничений БД (${kind})`);

  await backfillLibraryKeys(strapi, knex);
  await assertDataIsClean(strapi, knex);

  for (const statement of indexStatements(kind)) {
    try {
      await knex.raw(statement);
    } catch (err: any) {
      if (isDuplicateObjectError(err, kind)) continue;
      throw new Error(`[wallet] Не удалось создать ограничение: ${statement} -> ${err?.message ?? err}`);
    }
  }

  await ensureBalanceConstraint(strapi, knex, kind);

  strapi.log.info('[wallet] Денежные ограничения БД применены');
}

export default runWalletMigration;
