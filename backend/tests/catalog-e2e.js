/**
 * E2E-проверка единого каталога и серверной цены.
 *
 * Запуск: node tests/catalog-e2e.js
 * Требуется запущенный Strapi (:1337).
 */

const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const API = process.env.API_URL || 'http://127.0.0.1:1337';
function loadWebhookSecret() {
  if (process.env.PAYMENT_WEBHOOK_SECRET) return process.env.PAYMENT_WEBHOOK_SECRET;
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return '';
  const m = fs.readFileSync(envPath, 'utf8').match(/^PAYMENT_WEBHOOK_SECRET=(.+)$/m);
  return m ? m[1].trim() : '';
}
const PAYMENT_SECRET = loadWebhookSecret();

async function fund(userId, amount, eventId) {
  const body = JSON.stringify({ userId, amount });
  const signature = 'sha256=' + createHmac('sha256', PAYMENT_SECRET).update(body).digest('hex');
  const res = await fetch(`${API}/api/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-event-id': eventId,
      'x-payment-signature': signature,
    },
    body,
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}
const catalog = require('../src/data/catalog.json');

let jwt = '';

async function api(path, init = {}) {
  const res = await fetch(`${API}/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(jwt ? { Authorization: `Bearer ${jwt}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

function assert(cond, message) {
  if (!cond) {
    console.error('FAIL:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log('ok  -', message);
}

async function register(balance) {
  const ts = Date.now() + Math.floor(Math.random() * 1000);
  const res = await api('/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({
      username: `cat${ts}${Math.random().toString(36).slice(2, 6)}`,
      email: `cat${ts}${Math.random().toString(36).slice(2, 8)}@example.com`,
      password: 'Passw0rd!',
    }),
  });
  assert(res.status === 200 && res.body.jwt, `регистрация (${res.status})`);
  jwt = res.body.jwt;

  if (balance) {
    const dep = await fund(res.body.user.id, balance, `cat_init_${ts}`);
    assert(dep.status === 200 && dep.body.data.balance === balance, `баланс ${balance}`);
  }
  return res.body.user;
}

async function main() {
  // 1. Каталог читается целиком (pageSize=200), у каждой игры есть slug.
  const gamesRes = await api(
    '/games?pagination[pageSize]=200&fields[0]=Title&fields[1]=slug&fields[2]=Price&fields[3]=purchasable'
  );
  const games = gamesRes.body?.data ?? [];
  assert(gamesRes.status === 200, `GET /games (${gamesRes.status})`);
  assert(
    games.length >= catalog.length,
    `в БД не меньше ${catalog.length} игр из сида (получено ${games.length})`
  );

  const slugs = games.map((g) => g.slug).filter(Boolean);
  assert(slugs.length === games.length, 'у всех игр заполнен slug');
  assert(new Set(slugs).size === slugs.length, 'slug уникальны (сид идемпотентен)');

  const dbSlugs = new Set(slugs);
  assert(
    catalog.every((g) => dbSlugs.has(g.slug)),
    'все игры из единого сида catalog.json есть в БД'
  );

  const dummy = games.filter((g) =>
    ['Cyber Realm 2077', 'Neon Drift', 'Dungeon of Echoes', 'Stellar Vanguard'].includes(g.Title)
  );
  assert(dummy.length === 0, 'тестовых игр старого сида в каталоге нет');

  // 2. Цена покупки берётся из БД, а не из тела запроса.
  await register(20_000);
  const game = games.find((g) => g.purchasable !== false && Number(g.Price) > 0);
  assert(!!game, 'найдена доступная игра для покупки');

  const dbPrice = Number(game.Price);
  const gameId = game.documentId ?? game.id;
  const before = (await api('/wallets/me')).body.data.balance;

  const purchase = await api('/wallets/purchase', {
    method: 'POST',
    body: JSON.stringify({
      gameId,
      reference: `cat_buy_${Date.now()}`,
      // Клиент пытается навязать цену — сервер обязан её игнорировать.
      price: 1,
      Price: 1,
      amount: 1,
    }),
  });
  assert(purchase.status === 200, `покупка прошла (${purchase.status})`);

  const after = (await api('/wallets/me')).body.data.balance;
  assert(
    after === before - dbPrice,
    `списана цена из БД ${dbPrice}, а не цена клиента (${before} -> ${after})`
  );

  const lib = await api('/wallets/library');
  const item = lib.body.data.find(
    (i) => String(i.game?.documentId ?? i.game?.id) === String(gameId)
  );
  assert(!!item, 'игра попала в библиотеку');
  assert(
    Number(item.pricePaid) === dbPrice,
    `pricePaid в библиотеке = цене БД (${item.pricePaid})`
  );

  const wallet = (await api('/wallets/me')).body.data;
  const tx = wallet.transactions.find((t) => t.type === 'purchase' && t.status === 'completed');
  assert(!!tx, 'транзакция покупки записана');
  assert(
    Math.abs(Number(tx.amount)) === dbPrice,
    `сумма транзакции = цене БД (${tx.amount})`
  );
  assert(
    Number(tx.metadata?.price) === dbPrice,
    `metadata.price = цене БД (${tx.metadata?.price})`
  );

  console.log('\nКаталог и серверная цена работают корректно.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
