/**
 * E2E-проверка серверного прокси Next.js (/api/wallet/*) и защиты T-03.
 * Запуск: node frontend/tests/proxy-e2e.js
 */

const { createHmac } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const FRONT = process.env.FRONT_URL || 'http://127.0.0.1:3000';
const STRAPI = process.env.STRAPI_URL || 'http://127.0.0.1:1337';

function loadWebhookSecret() {
  if (process.env.PAYMENT_WEBHOOK_SECRET) return process.env.PAYMENT_WEBHOOK_SECRET;
  const envPath = path.resolve(__dirname, '../../backend/.env');
  if (!fs.existsSync(envPath)) return '';
  const m = fs.readFileSync(envPath, 'utf8').match(/^PAYMENT_WEBHOOK_SECRET=(.+)$/m);
  return m ? m[1].trim() : '';
}
const PAYMENT_SECRET = loadWebhookSecret();

async function fund(userId, amount, eventId) {
  const body = JSON.stringify({ userId, amount });
  const res = await fetch(`${STRAPI}/api/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-event-id': eventId,
      'x-payment-signature':
        'sha256=' + createHmac('sha256', PAYMENT_SECRET).update(body).digest('hex'),
    },
    body,
  });
  return res.json().catch(() => ({}));
}

function assert(cond, message) {
  if (!cond) {
    console.error('FAIL:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log('ok  -', message);
}

async function main() {
  const unauth = await fetch(`${FRONT}/api/wallet/wallets/me`);
  assert(unauth.status === 401, `без токена прокси вернул 401 (got ${unauth.status})`);

  const ts = Date.now();
  const reg = await fetch(`${STRAPI}/api/auth/local/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: `proxy${ts}`,
      email: `proxy${ts}@example.com`,
      password: 'Password123!',
    }),
  }).then((r) => r.json());
  assert(!!reg.jwt, 'пользователь Strapi создан');
  const auth = { 'Content-Type': 'application/json', Authorization: `Bearer ${reg.jwt}` };

  const deposit = await fund(reg.user.id, 2500, `proxy_dep_${ts}`);
  assert(deposit?.data?.balance === 2500, `пополнение через webhook: ${deposit?.data?.balance}`);

  const me = await fetch(`${FRONT}/api/wallet/wallets/me`, { headers: auth }).then((r) => r.json());
  assert(me?.data?.balance === 2500, 'баланс читается через прокси');

  const games = await fetch(`${STRAPI}/api/games?pagination[pageSize]=10`).then((r) => r.json());
  const game = (games.data || []).find((g) => Number(g.Price) > 0 && Number(g.Price) <= 2500);
  assert(!!game, `найдена игра для покупки: ${game?.Title}`);
  const gameId = game.documentId || game.id;

  const buy = await fetch(`${FRONT}/api/wallet/wallets/purchase`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ gameId, reference: `proxy_buy_${ts}` }),
  });
  const buyJson = await buy.json();
  assert(buy.status === 200, `покупка через прокси: ${buy.status}`);
  assert(buyJson?.data?.balance === 2500 - Number(game.Price), 'баланс списан корректно');

  const lib = await fetch(`${FRONT}/api/wallet/wallets/library`, { headers: auth }).then((r) => r.json());
  assert(
    Array.isArray(lib.data) &&
      lib.data.some((i) => (i.game?.documentId || i.game?.id) === gameId),
    'купленная игра есть в библиотеке'
  );

  // Публичный deposit и неизвестные пути запрещены прокси (403).
  const blockedDeposit = await fetch(`${FRONT}/api/wallet/wallets/deposit`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({ amount: 100 }),
  });
  assert(blockedDeposit.status === 403, `публичный deposit запрещён прокси (403, got ${blockedDeposit.status})`);

  const forbidden = await fetch(`${FRONT}/api/wallet/wallets/anything`, {
    method: 'POST',
    headers: auth,
    body: JSON.stringify({}),
  });
  assert(forbidden.status === 403, `неизвестный путь прокси запрещён (403, got ${forbidden.status})`);

  console.log('\nПрокси работает корректно.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
