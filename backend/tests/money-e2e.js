/**
 * E2E-проверка денежного модуля (T-02, T-03, IDOR, гонки, коды ошибок).
 * Запуск: node backend/tests/money-e2e.js
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

let jwt = '';
let currentUser = null;

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
  const json = await res.json().catch(() => ({}));
  return { status: res.status, body: json };
}

async function api(p, init = {}) {
  const res = await fetch(`${API}/api${p}`, {
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

async function register(balance = 0) {
  jwt = '';
  const ts = Date.now() + Math.floor(Math.random() * 1000);
  const res = await api('/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({
      username: `e2e${ts}${Math.random().toString(36).slice(2, 6)}`,
      email: `e2e${ts}${Math.random().toString(36).slice(2, 8)}@example.com`,
      password: 'Password123!',
    }),
  });
  assert(res.status === 200 && res.body.jwt, `регистрация пользователя (${res.status})`);
  jwt = res.body.jwt;
  currentUser = res.body.user;

  if (balance) {
    const dep = await fund(currentUser.id, balance, `init_${ts}_${Math.random().toString(36).slice(2, 6)}`);
    assert(dep.status === 200 && dep.body.data.balance === balance, `стартовый баланс ${balance}`);
  }
  return res.body.user;
}

async function getGame() {
  const res = await api('/games?pagination[pageSize]=20');
  const list = res.body?.data ?? [];
  const game = list.find((g) => Number(g.Price) > 0 && g.purchasable !== false) || list[0];
  assert(!!game, 'найдена игра для покупки');
  return { game, list };
}

async function main() {
  assert(!!PAYMENT_SECRET, 'PAYMENT_WEBHOOK_SECRET загружен');

  await register(0);

  const me = await api('/wallets/me');
  assert(me.status === 200 && typeof me.body.data.balance === 'number', `кошелёк создан (${me.status})`);

  // T-03: публичный /wallets/deposit закрыт
  const pubDep = await api('/wallets/deposit', { method: 'POST', body: JSON.stringify({ amount: 1000 }) });
  assert(pubDep.status === 404 || pubDep.status === 405, `публичный /wallets/deposit закрыт (404/405, got ${pubDep.status})`);

  // T-03: неверная подпись webhook отклонена
  const badSig = await fetch(`${API}/api/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-event-id': `bad_sig_${Date.now()}`,
      'x-payment-signature': 'sha256=' + '0'.repeat(64),
    },
    body: JSON.stringify({ userId: currentUser.id, amount: 1000 }),
  });
  assert(badSig.status === 401, `webhook с неверной подписью отклонён (401, got ${badSig.status})`);

  // Пополнение и идемпотентность через webhook
  const dep = await fund(currentUser.id, 1000, `dep_e2e_${Date.now()}`);
  assert(dep.status === 200 && dep.body.data.balance === 1000, 'пополнение через webhook на 1000');

  const ref = `dep_idem_${Date.now()}`;
  const a = await fund(currentUser.id, 50, ref);
  const b = await fund(currentUser.id, 50, ref);
  assert(a.status === 200 && b.status === 200, 'повторное платёжное событие принято');
  assert(b.body.data.balance === a.body.data.balance && b.body.idempotent === true, 'повтор события идемпотентен');

  // Параллельные пополнения с одним eventId
  const raceRef = `dep_race_${Date.now()}`;
  const balBeforeRace = (await api('/wallets/me')).body.data.balance;
  const raceDeps = await Promise.all(Array.from({ length: 4 }, () => fund(currentUser.id, 25, raceRef)));
  assert(raceDeps.every((r) => r.status === 200), 'параллельные webhook с одним eventId идемпотентны');
  const balAfterRace = (await api('/wallets/me')).body.data.balance;
  assert(balAfterRace === balBeforeRace + 25, `параллельный webhook начислен ровно один раз (${balBeforeRace} -> ${balAfterRace})`);

  // Недостаточно средств -> 402 и без утечки баланса
  const bad = await api('/wallets/withdraw', { method: 'POST', body: JSON.stringify({ amount: 9_999_999 }) });
  assert(bad.status === 402, `списание больше баланса отклонено (402, got ${bad.status})`);
  assert(!String(bad.body?.error?.message ?? '').includes('баланс '), 'ошибка не раскрывает баланс');

  // IDOR: чужая транзакция не может быть отменена (403)
  const victimTxRef = dep.body.data.transaction.reference;
  await register(20_000);
  const foreignRev = await api('/wallets/reverse', {
    method: 'POST',
    body: JSON.stringify({ reference: victimTxRef }),
  });
  assert(foreignRev.status === 403, `нельзя отменить чужую транзакцию (403, got ${foreignRev.status})`);

  // Параллельные покупки одной игры
  const { game } = await getGame();
  const gameId = game.documentId ?? game.id;
  const price = Number(game.Price ?? 0);
  const before = (await api('/wallets/me')).body.data.balance;
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, i) =>
      api('/wallets/purchase', {
        method: 'POST',
        body: JSON.stringify({ gameId, reference: `e2e_${Date.now()}_${i}` }),
      })
    )
  );
  const ok = results.filter((r) => r.status === 200);
  assert(ok.length === 1, `из 5 параллельных покупок успешна ровно одна (got ${ok.length})`);
  const after = (await api('/wallets/me')).body.data.balance;
  assert(after === before - price, `баланс уменьшен ровно на цену ${price}`);

  // Повторная покупка той же игры -> 409
  const again = await api('/wallets/purchase', {
    method: 'POST',
    body: JSON.stringify({ gameId, reference: `e2e_again_${Date.now()}` }),
  });
  assert(again.status === 409, `повторная покупка отклонена (409, got ${again.status})`);

  // T-02: параллельный двойной возврат своей покупки -> успешен ровно один
  const buyRef = ok[0].body.data.transaction.reference;
  const revResults = await Promise.all([
    api('/wallets/reverse', { method: 'POST', body: JSON.stringify({ reference: buyRef }) }),
    api('/wallets/reverse', { method: 'POST', body: JSON.stringify({ reference: buyRef }) }),
  ]);
  const revOk = revResults.filter((r) => r.status === 200);
  assert(revOk.length === 1, `из 2 параллельных reverse успешен ровно один (got ${revOk.length})`);
  const afterRev = (await api('/wallets/me')).body.data.balance;
  assert(afterRev === after + price, `возврат вернул деньги ровно один раз (${after} -> ${afterRev})`);

  console.log('\nВсе проверки money-e2e пройдены.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
