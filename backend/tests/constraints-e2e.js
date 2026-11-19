/**
 * Проверка денежных ограничений на уровне БД.
 *
 * Запуск (SQLite, по умолчанию):
 *   node tests/constraints-e2e.js
 *
 * Запуск (PostgreSQL):
 *   $env:DATABASE_CLIENT='postgres'; node tests/constraints-e2e.js
 *
 * Проверяет:
 *  - UNIQUE transactions.reference;
 *  - UNIQUE wallets.user (wallets_user_lnk.user_id);
 *  - UNIQUE library_items(wallet_id, game_id);
 *  - CHECK wallets.balance >= 0 (PG constraint / SQLite-триггеры);
 *  - что ограничения реально отклоняют плохие данные.
 */

const path = require('path');

const CLIENT = (process.env.DATABASE_CLIENT || 'sqlite').toLowerCase();
const IS_PG = CLIENT.includes('postgres');

let failures = 0;

function ok(message) {
  console.log('ok  -', message);
}

function fail(message) {
  failures += 1;
  console.error('FAIL:', message);
}

function assert(cond, message) {
  if (cond) ok(message);
  else fail(message);
}

async function expectRejected(fn, message) {
  try {
    await fn();
    fail(message + ' (ограничение не сработало)');
  } catch (err) {
    ok(message);
  }
}

function sqliteChecks() {
  const Database = require('better-sqlite3');
  const db = new Database(path.resolve(__dirname, '..', '.tmp', 'data.db'));

  const indexes = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'index'")
    .all()
    .map((r) => r.name);
  const triggers = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'")
    .all()
    .map((r) => r.name);

  assert(indexes.includes('transactions_reference_unique'), 'UNIQUE transactions.reference');
  assert(indexes.includes('wallets_user_lnk_user_unique'), 'UNIQUE wallets.user');
  assert(indexes.includes('library_items_wallet_game_unique'), 'UNIQUE library_items(wallet_id, game_id)');
  assert(
    triggers.includes('wallets_balance_non_negative_insert') &&
      triggers.includes('wallets_balance_non_negative_update'),
    'CHECK wallets.balance >= 0 (триггеры SQLite)'
  );

  // Функциональные проверки: плохие данные должны отклоняться.
  db.exec('BEGIN');
  expectRejected(
    () => db.prepare('INSERT INTO wallets (document_id, balance) VALUES (?, ?)').run('neg-test', -1),
    'SQLite: отрицательный баланс отклонён'
  );
  db.exec('ROLLBACK');

  db.exec('BEGIN');
  db.prepare('INSERT INTO wallets (document_id, balance) VALUES (?, ?)').run('dup-test', 0);
  db.prepare('INSERT INTO library_items (document_id, wallet_id, game_id) VALUES (?, ?, ?)').run(
    'li-1',
    900001,
    900001
  );
  expectRejected(
    () =>
      db
        .prepare('INSERT INTO library_items (document_id, wallet_id, game_id) VALUES (?, ?, ?)')
        .run('li-2', 900001, 900001),
    'SQLite: повторная пара (wallet_id, game_id) отклонена'
  );
  db.exec('ROLLBACK');

  db.exec('BEGIN');
  db.prepare('INSERT INTO transactions (document_id, reference) VALUES (?, ?)').run('tx-1', 'ref-test');
  expectRejected(
    () =>
      db
        .prepare('INSERT INTO transactions (document_id, reference) VALUES (?, ?)')
        .run('tx-2', 'ref-test'),
    'SQLite: дубль transactions.reference отклонён'
  );
  db.exec('ROLLBACK');

  const linked = db
    .prepare('SELECT user_id FROM wallets_user_lnk WHERE user_id IS NOT NULL LIMIT 1')
    .get();
  const walletRows = db.prepare('SELECT id FROM wallets LIMIT 2').all();
  if (linked && walletRows.length >= 2) {
    db.exec('BEGIN');
    db.prepare('DELETE FROM wallets_user_lnk WHERE user_id = ?').run(linked.user_id);
    db.prepare('INSERT INTO wallets_user_lnk (wallet_id, user_id) VALUES (?, ?)').run(
      walletRows[0].id,
      linked.user_id
    );
    expectRejected(
      () =>
        db
          .prepare('INSERT INTO wallets_user_lnk (wallet_id, user_id) VALUES (?, ?)')
          .run(walletRows[1].id, linked.user_id),
      'SQLite: второй кошелёк у пользователя отклонён'
    );
    db.exec('ROLLBACK');
  } else {
    console.log('skip - SQLite: нет пользователя/двух кошельков для FK-проверки');
  }

  db.close();
}

async function pgChecks() {
  const { Client } = require('pg');
  const client = new Client({
    host: process.env.DATABASE_HOST || '127.0.0.1',
    port: Number(process.env.DATABASE_PORT || 5432),
    database: process.env.DATABASE_NAME || 'unifiedstack',
    user: process.env.DATABASE_USERNAME || 'strapi',
    password: process.env.DATABASE_PASSWORD || 'strapi',
  });
  await client.connect();

  try {
    const indexes = (
      await client.query("SELECT indexname FROM pg_indexes WHERE schemaname = 'public'")
    ).rows.map((r) => r.indexname);
    const constraints = (
      await client.query(
        "SELECT conname FROM pg_constraint WHERE conname = 'wallets_balance_non_negative'"
      )
    ).rows.map((r) => r.conname);

    assert(indexes.includes('transactions_reference_unique'), 'UNIQUE transactions.reference');
    assert(indexes.includes('wallets_user_lnk_user_unique'), 'UNIQUE wallets.user');
    assert(indexes.includes('library_items_wallet_game_unique'), 'UNIQUE library_items(wallet_id, game_id)');
    assert(constraints.includes('wallets_balance_non_negative'), 'CHECK wallets.balance >= 0');

    await client.query('BEGIN');
    await expectRejected(
      () => client.query('INSERT INTO wallets (document_id, balance) VALUES ($1, $2)', ['neg-test', -1]),
      'Postgres: отрицательный баланс отклонён'
    );
    await client.query('ROLLBACK');

    await client.query('BEGIN');
    await client.query('INSERT INTO wallets (document_id, balance) VALUES ($1, $2)', ['dup-test', 0]);
    await client.query(
      'INSERT INTO library_items (document_id, wallet_id, game_id) VALUES ($1, $2, $3)',
      ['li-1', 900001, 900001]
    );
    await expectRejected(
      () =>
        client.query(
          'INSERT INTO library_items (document_id, wallet_id, game_id) VALUES ($1, $2, $3)',
          ['li-2', 900001, 900001]
        ),
      'Postgres: повторная пара (wallet_id, game_id) отклонена'
    );
    await client.query('ROLLBACK');

    await client.query('BEGIN');
    await client.query('INSERT INTO transactions (document_id, reference) VALUES ($1, $2)', [
      'tx-1',
      'ref-test',
    ]);
    await expectRejected(
      () =>
        client.query('INSERT INTO transactions (document_id, reference) VALUES ($1, $2)', [
          'tx-2',
          'ref-test',
        ]),
      'Postgres: дубль transactions.reference отклонён'
    );
    await client.query('ROLLBACK');

    const linked = (
      await client.query(
        'SELECT user_id FROM wallets_user_lnk WHERE user_id IS NOT NULL LIMIT 1'
      )
    ).rows[0];
    const walletRows = (await client.query('SELECT id FROM wallets LIMIT 2')).rows;

    if (linked && walletRows.length >= 2) {
      await client.query('BEGIN');
      await client.query('DELETE FROM wallets_user_lnk WHERE user_id = $1', [linked.user_id]);
      await client.query('INSERT INTO wallets_user_lnk (wallet_id, user_id) VALUES ($1, $2)', [
        walletRows[0].id,
        linked.user_id,
      ]);
      await expectRejected(
        () =>
          client.query('INSERT INTO wallets_user_lnk (wallet_id, user_id) VALUES ($1, $2)', [
            walletRows[1].id,
            linked.user_id,
          ]),
        'Postgres: второй кошелёк у пользователя отклонён'
      );
      await client.query('ROLLBACK');
    } else {
      console.log('skip - Postgres: нет пользователя/двух кошельков для FK-проверки');
    }
  } finally {
    await client.end();
  }
}

(async () => {
  console.log(`Проверка ограничений (${IS_PG ? 'postgres' : 'sqlite'})`);
  if (IS_PG) await pgChecks();
  else sqliteChecks();

  if (failures > 0) {
    console.error(`\nПровалено проверок: ${failures}`);
    process.exit(1);
  }
  console.log('\nВсе ограничения на месте.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
