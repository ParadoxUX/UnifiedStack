/**
 * E2E-проверка денежной логики.
 * Запуск: node tests/money-e2e.js
 */

const API = process.env.API_URL || 'http://127.0.0.1:1337';

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
      username: `user${ts}${Math.random().toString(36).slice(2, 6)}`, 
      email: `test${ts}${Math.random().toString(36).slice(2, 8)}@example.com`, 
      password: 'Passw0rd!' 
    }),
  });
  assert(res.status === 200 && res.body.jwt, `регистрация пользователя (${res.status}: ${JSON.stringify(res.body).slice(0, 200)})`);
  jwt = res.body.jwt;

  if (balance) {
    const dep = await api('/wallets/deposit', {
      method: 'POST',
      body: JSON.stringify({ amount: balance, reference: `init_${ts}` }),
    });
    assert(dep.status === 200 && dep.body.data.balance === balance, `стартовый баланс ${balance}`);
  }
  return res.body.user;
}

async function main() {
  await register(1000);

  const me = await api('/wallets/me');
  assert(me.status === 200, `кошелёк создан (${me.status})`);

  const anonJwt = jwt;
  jwt = '';
  const anonBuy = await api('/wallets/purchase', {
    method: 'POST',
    body: JSON.stringify({ gameId: 1, reference: `anon_${Date.now()}` }),
  });
  assert(anonBuy.status === 401, `анонимная покупка возвращает 401 (${anonBuy.status})`);
  jwt = anonJwt;

  const badIdBuy = await api('/wallets/purchase', {
    method: 'POST',
    body: JSON.stringify({ gameId: 'not-a-number', reference: `badid_${Date.now()}` }),
  });
  assert(badIdBuy.status === 400, `нечисловой gameId отклонен (${badIdBuy.status})`);

  const dep = await api('/wallets/deposit', {
    method: 'POST',
    body: JSON.stringify({ amount: 100, reference: `dep_${Date.now()}` }),
  });
  assert(dep.status === 200, 'дополнительное пополнение');
  
  const txRef = dep.body.data.transaction.reference;
  
  const user1Jwt = jwt;
  await register(0); 
  
  const foreignRev = await api('/wallets/reverse', {
    method: 'POST',
    body: JSON.stringify({ reference: txRef }),
  });
  assert(foreignRev.status === 400, `нельзя реверснуть чужую транзакцию (${foreignRev.status})`);

  jwt = user1Jwt;

  const rev1 = await api('/wallets/reverse', {
    method: 'POST',
    body: JSON.stringify({ reference: txRef }),
  });
  assert(rev1.status === 200, 'первый реверс прошел');

  const rev2 = await api('/wallets/reverse', {
    method: 'POST',
    body: JSON.stringify({ reference: txRef }),
  });
  assert(rev2.status === 400, `повторный реверс отклонен (${rev2.status})`);

  await register();
  const raceResults = await Promise.all(
    Array.from({ length: 10 }, () => api('/wallets/me'))
  );
  assert(raceResults.every(r => r.status === 200), 'параллельные запросы кошелька не вызывают ошибок (гонка ensureWallet)');

  const refIdem = `idem_${Date.now()}`;
  const a = await api('/wallets/deposit', { method: 'POST', body: JSON.stringify({ amount: 50, reference: refIdem }) });
  const b = await api('/wallets/deposit', { method: 'POST', body: JSON.stringify({ amount: 50, reference: refIdem }) });
  assert(a.status === 200 && b.status === 200, 'повторный deposit принят');
  assert(b.body.data.balance === a.body.data.balance, 'повторный deposit не начислил дважды (идемпотентность)');

  console.log('\nВсе проверки пройдены.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});