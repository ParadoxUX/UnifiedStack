/**
 * E2E-проверка денежной логики.
 * Запуск: node tests/money-e2e.js
 */

const { createHmac } = require('node:crypto');

const API = process.env.API_URL || 'http://127.0.0.1:1337';
const PAYMENT_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || '';

let jwt = '';
let currentUser = null;

/** Зачисление через защищённый webhook платёжного провайдера. */
async function fund(userId, amount, eventId) {
  const body = JSON.stringify({ userId, amount });
  const signature =
    'sha256=' + createHmac('sha256', PAYMENT_SECRET).update(body).digest('hex');

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
    headers: jwt ? { Authorization: '' } : {},
    body: JSON.stringify({ username: `user${ts}${Math.random().toString(36).slice(2, 6)}`, email: `test${ts}${Math.random().toString(36).slice(2, 8)}@example.com`, password: 'Passw0rd!' }),
  });
  assert(res.status === 200 && res.body.jwt, `регистрация пользователя (${res.status}: ${JSON.stringify(res.body).slice(0, 200)})`);
  jwt = res.body.jwt;
  currentUser = res.body.user;

  if (balance) {
    const dep = await fund(currentUser.id, balance, `init_${ts}`);
    assert(dep.status === 200 && dep.body.data.balance === balance, `стартовый баланс ${balance}`);
  }
  return res.body.user;
}

async function getGame() {
  const gamesRes = await api('/games?pagination[limit]=20');
  const games = gamesRes.body?.data ?? [];
  const game = games.find((g) => g.purchasable !== false);
  assert(!!game, `найдена доступная игра (${gamesRes.status}, всего ${games.length})`);
  return { game, list: games };
}

async function main() {
  await register();

  const me = await api('/wallets/me');
  assert(me.status === 200, `кошелёк создан (${me.status})`);
  assert(typeof me.body.data.balance === 'number', `баланс читается: ${me.body.data.balance}`);

  // Публичный deposit закрыт.
  const publicDeposit = await api('/wallets/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount: 1000 }),
  });
  assert(publicDeposit.status === 404, 'публичный /wallets/deposit недоступен');

  // Неверная подпись webhook не проходит.
  const badSig = await fetch(`${API}/api/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-event-id': `bad_sig_${Date.now()}`,
      'x-payment-signature': 'sha256=' + '0'.repeat(64),
    },
    body: JSON.stringify({ userId: currentUser.id, amount: 1000 }),
  });
  assert(badSig.status === 401, 'webhook с неверной подписью отклонён');

  const dep = await fund(currentUser.id, 1000, `dep_e2e_${Date.now()}`);
  assert(dep.status === 200 && dep.body.data.balance === 1000, 'пополнение через webhook на 1000');

  const ref = `dep_idem_${Date.now()}`;
  const a = await fund(currentUser.id, 50, ref);
  const b = await fund(currentUser.id, 50, ref);
  assert(a.status === 200 && b.status === 200, 'повторное платёжное событие принято');
  assert(b.body.data.balance === a.body.data.balance, 'повтор события не начислил дважды');
  assert(b.body.idempotent === true, 'повтор события помечен как idempotent');

  const bad = await api('/wallets/withdraw', { method: 'POST', body: JSON.stringify({ amount: 9_999_999 }) });
  assert(bad.status === 400, 'списание больше баланса отклонено');

  // Параллельные покупки — отдельный пользователь с достаточным балансом.
  await register(20_000);
  const { game } = await getGame();
  const gameId = game.documentId ?? game.id;
  const price = Number(game.Price ?? 0);

  const before = (await api('/wallets/me')).body.data.balance;
  const stockBefore = game.stock;
  const countBefore = Number(game.purchaseCount ?? 0);

  const N = 5;
  const results = await Promise.all(
    Array.from({ length: N }, (_, i) =>
      api('/wallets/purchase', {
        method: 'POST',
        body: JSON.stringify({ gameId, reference: `e2e_${Date.now()}_${i}` }),
      })
    )
  );
  const ok = results.filter((r) => r.status === 200);
  if (ok.length !== 1) {
    results.forEach((r) => console.log('   ->', r.status, r.body?.error?.message));
  }
  assert(ok.length === 1, `из ${N} параллельных покупок успешна ровно одна (got ${ok.length})`);

  const after = (await api('/wallets/me')).body.data.balance;
  assert(after === before - price, `баланс уменьшен ровно на цену ${price}`);

  const lib = await api('/wallets/library');
  assert(
    lib.status === 200 &&
      lib.body.data.some((i) => (i.game?.documentId ?? String(i.game?.id)) === String(gameId)),
    'игра появилась в библиотеке'
  );

  const g2 = await api(`/games/${gameId}`);
  const updated = g2?.body?.data;
  assert(!!updated, 'игра читается после покупки');
  assert(
    Number(updated.purchaseCount) === countBefore + 1,
    `purchaseCount увеличен на 1 (${countBefore} -> ${updated.purchaseCount})`
  );
  assert(!!updated.lastPurchasedAt, 'lastPurchasedAt записан');
  if (typeof stockBefore === 'number') {
    assert(updated.stock === stockBefore - 1, `остаток уменьшен (${stockBefore} -> ${updated.stock})`);
  }

  const again = await api('/wallets/purchase', {
    method: 'POST',
    body: JSON.stringify({ gameId, reference: `e2e_again_${Date.now()}` }),
  });
  assert(again.status === 400, 'повторная покупка той же игры отклонена');

  const wallet = (await api('/wallets/me')).body.data;
  assert(wallet.transactions.length >= 2, `журнал транзакций заполнен (${wallet.transactions.length})`);

  const purchaseTx = wallet.transactions.find((t) => t.type === 'purchase' && t.status === 'completed');
  if (purchaseTx) {
    const rev = await api('/wallets/reverse', {
      method: 'POST',
      body: JSON.stringify({ reference: purchaseTx.reference }),
    });
    assert(rev.status === 200 && rev.body.data.balance === after + price, 'возврат вернул деньги');
  }

  console.log('\nВсе проверки пройдены.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
