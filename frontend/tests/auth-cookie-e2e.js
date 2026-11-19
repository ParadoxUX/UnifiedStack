/**
 * Проверка cookie-авторизации и защиты приватных страниц.
 *
 * Запуск (нужны запущенные Next.js и Strapi):
 *   node tests/auth-cookie-e2e.js
 */

const FRONT = process.env.FRONT_URL || 'http://127.0.0.1:3000';

function assert(cond, message) {
  if (!cond) {
    console.error('FAIL:', message);
    process.exitCode = 1;
    throw new Error(message);
  }
  console.log('ok  -', message);
}

function getSetCookie(res) {
  return res.headers.get('set-cookie') || '';
}

async function main() {
  const ts = Date.now() + Math.floor(Math.random() * 1000);
  const email = `cookie${ts}@example.com`;
  const username = `ck${ts}`;
  const password = 'Passw0rd!';

  // 1. Регистрация: JWT не попадает в JSON, а уходит в httpOnly-куку.
  const reg = await fetch(`${FRONT}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, email, password }),
  });
  const regJson = await reg.json().catch(() => ({}));
  assert(reg.status === 200, `регистрация через /api/auth/register: ${reg.status}`);
  assert(!('jwt' in regJson), 'в ответе регистрации нет JWT');
  assert(!JSON.stringify(regJson).toLowerCase().includes('passwordhash'), 'в ответе нет passwordHash');

  const setCookie = getSetCookie(reg);
  assert(/HttpOnly/i.test(setCookie), 'кука помечена HttpOnly');
  assert(/SameSite=Strict/i.test(setCookie), 'кука помечена SameSite=Strict');
  const cookie = setCookie.split(';')[0];
  assert(/^us_auth=/.test(cookie), 'используется кука us_auth');

  // 2. Без куки приватные страницы не рендерятся.
  for (const page of ['/library', '/profile']) {
    const anon = await fetch(`${FRONT}${page}`, { redirect: 'manual' });
    assert(anon.status === 307, `${page} без куки → 307 (получено ${anon.status})`);
    const location = anon.headers.get('location') || '';
    assert(location.includes('auth=required'), `${page} редиректит на форму входа`);
    assert(location.includes('next='), `${page} передаёт адрес возврата`);
  }

  // 3. С валидной кукой страницы открываются.
  for (const page of ['/library', '/profile']) {
    const authed = await fetch(`${FRONT}${page}`, {
      redirect: 'manual',
      headers: { Cookie: cookie },
    });
    assert(authed.status === 200, `${page} с кукой → 200 (получено ${authed.status})`);
  }

  // 4. /api/auth/me подтверждает сессию и не отдаёт секретов.
  const me = await fetch(`${FRONT}/api/auth/me`, { headers: { Cookie: cookie } });
  const meJson = await me.json().catch(() => ({}));
  assert(me.status === 200, 'сессия подтверждается через /api/auth/me');
  assert(meJson.user?.username === username, 'профиль соответствует пользователю');
  assert(!JSON.stringify(meJson).includes('jwt'), 'в /api/auth/me нет JWT');

  // 5. Кошелёк работает по куке, без Authorization из JS.
  const wallet = await fetch(`${FRONT}/api/wallet/wallets/me`, {
    headers: { Cookie: cookie },
  });
  assert(wallet.status === 200, `кошелёк доступен по куке: ${wallet.status}`);

  // 6. Выход удаляет куку.
  const logout = await fetch(`${FRONT}/api/auth/logout`, {
    method: 'POST',
    headers: { Cookie: cookie },
  });
  const clearCookie = getSetCookie(logout);
  assert(logout.status === 200, 'выход выполняется');
  assert(/Max-Age=0/i.test(clearCookie) || /us_auth=;/.test(clearCookie), 'кука очищается');

  // 7. Повторный вход по email/паролю снова выдаёт httpOnly-куку.
  const login = await fetch(`${FRONT}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  });
  const loginJson = await login.json().catch(() => ({}));
  const loginCookie = getSetCookie(login);
  assert(login.status === 200, `вход через /api/auth/login: ${login.status}`);
  assert(!('jwt' in loginJson), 'в ответе входа нет JWT');
  assert(/HttpOnly/i.test(loginCookie), 'кука входа HttpOnly');

  const sessionCookie = loginCookie.split(';')[0];
  const meAgain = await fetch(`${FRONT}/api/auth/me`, { headers: { Cookie: sessionCookie } });
  assert(meAgain.status === 200, 'сессия после повторного входа активна');

  // 8. Серверный прокси Strapi отвечает (чтение публичной коллекции).
  const strapiProxy = await fetch(`${FRONT}/api/strapi/games?pagination[limit]=1`);
  assert(strapiProxy.status === 200, `прокси /api/strapi работает: ${strapiProxy.status}`);

  console.log('\nCookie-авторизация и защита страниц работают корректно.');
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
