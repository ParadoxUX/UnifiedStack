/**
 * E2E-проверка безопасности тикетов поддержки.
 *
 * Запуск: node tests/support-e2e.js
 * Для другого инстанса: API_URL=http://127.0.0.1:1338
 *
 * Проверяет:
 *  - аноним не может создать тикет;
 *  - Author / ContactEmail / TicketNumber из тела запроса игнорируются
 *    и подставляются сервером;
 *  - rate limit на создание тикетов;
 *  - публичное чтение тикетов продолжает работать.
 */

const API = process.env.API_URL || 'http://127.0.0.1:1337';

async function api(path, { jwt, ...init } = {}) {
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

function createBody(data) {
  return JSON.stringify({ data });
}

async function main() {
  const ts = Date.now() + Math.floor(Math.random() * 1000);
  const username = `supporter${ts}`;
  const email = `support${ts}@example.com`;

  const reg = await api('/auth/local/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password: 'Passw0rd!' }),
  });
  assert(reg.status === 200 && reg.body.jwt, `регистрация пользователя (${reg.status})`);
  const jwt = reg.body.jwt;

  // 1. Аноним не может создать тикет.
  const anon = await api('/support-tickets', {
    method: 'POST',
    body: createBody({
      Subject: 'anonymous',
      Message: 'anonymous',
      Author: 'Hacker',
      ContactEmail: 'evil@example.com',
      TicketNumber: 'TK-FAKE',
    }),
  });
  assert(
    anon.status === 401 || anon.status === 403,
    `аноним не может создать тикет (${anon.status})`
  );

  // 2. Подмена Author / ContactEmail / TicketNumber игнорируется.
  const forged = await api('/support-tickets', {
    method: 'POST',
    jwt,
    body: createBody({
      Subject: 'Forged ticket',
      Message: 'Проверка подмены полей',
      Author: 'Hacker',
      ContactEmail: 'evil@example.com',
      TicketNumber: 'TK-FAKE',
      Status: 'closed',
    }),
  });
  assert(
    forged.status === 200 || forged.status === 201,
    `авторизованный создаёт тикет (${forged.status})`
  );

  const ticket = forged.body.data;
  assert(ticket?.Author === username, `Author подставлен сервером (${ticket?.Author})`);
  assert(
    ticket?.ContactEmail === email,
    `ContactEmail подставлен сервером (${ticket?.ContactEmail})`
  );
  assert(
    typeof ticket?.TicketNumber === 'string' &&
      ticket.TicketNumber !== 'TK-FAKE' &&
      ticket.TicketNumber.startsWith('TK-'),
    `TicketNumber сгенерирован сервером (${ticket?.TicketNumber})`
  );
  assert(ticket?.Status === 'open', `новый тикет открыт (${ticket?.Status})`);

  // 3. Rate limit.
  let got429 = false;
  let successes = 1; // тикет из шага 2
  let lastStatus = 0;

  for (let i = 0; i < 12; i++) {
    const res = await api('/support-tickets', {
      method: 'POST',
      jwt,
      body: createBody({ Subject: `rate ${i}`, Message: 'rate limit check' }),
    });
    lastStatus = res.status;
    if (res.status === 429) {
      got429 = true;
      break;
    }
    if (res.status === 200 || res.status === 201) successes += 1;
  }

  assert(got429, `rate limit срабатывает (последний статус ${lastStatus})`);
  assert(successes <= 5, `успешных созданий не больше лимита (${successes})`);

  // 4. Чтение тикетов остаётся публичным.
  const list = await api('/support-tickets?pagination[limit]=1');
  assert(list.status === 200, `публичное чтение тикетов работает (${list.status})`);

  console.log('\nВсе проверки пройдены.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
