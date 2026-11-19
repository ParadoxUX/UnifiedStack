# Авторизация

В проекте одна auth-система: **Strapi users-permissions**. JWT выдаёт Strapi,
а фронтенд не хранит его в JavaScript-доступном виде.

## Поток

1. Браузер отправляет логин/пароль на собственный route handler
   `POST /api/auth/login` (или `POST /api/auth/register`).
2. Next.js-сервер вызывает Strapi `/api/auth/local` и получает `jwt`.
3. JWT кладётся в `Set-Cookie`:

   ```
   us_auth=<jwt>; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800
   ```

   В production добавляется `Secure` (кука только по HTTPS).
4. В JSON-ответе остаётся только публичный профиль (`user`) — токена там нет.
5. Дальнейшие запросы (`/api/auth/me`, `/api/wallet/*`, `/api/strapi/*`)
   читают JWT из куки уже на сервере и подставляют его в `Authorization`
   к Strapi.

В `localStorage` хранится только кэш публичного профиля
(`ampligame_current_user`) для отрисовки шапки. JWT, пароли и хеши паролей
в браузере не хранятся.

## Защита страниц

Приватные маршруты `/library` и `/profile` закрыты в `frontend/src/proxy.ts`.
В Next.js 16 файл `middleware.ts` переименован в `proxy.ts` (экспорт `proxy`),
функциональность та же — код выполняется до рендера страницы.

Без куки `us_auth` запрос получает `307` на:

```
/?auth=required&next=/library
```

`TopBar` видит `auth=required`, открывает модалку входа, а после успешного
входа возвращает пользователя на `next`. Подпись и срок жизни токена
проверяет Strapi в `/api/auth/me` и `/api/wallet/*`; подделанная кука не даёт
доступа к данным.

## Выход

`POST /api/auth/logout` выставляет `us_auth` с `Max-Age=0` и очищает кэш
профиля в `localStorage`.

## Проверка

При запущенных Next.js (`:3000`) и Strapi (`:1337`):

```
cd frontend
node tests/auth-cookie-e2e.js
```

Тест проверяет, что:

- ответы `/api/auth/*` не содержат JWT;
- кука помечена `HttpOnly` и `SameSite=Strict`;
- `/library` и `/profile` без куки отвечают `307` на форму входа;
- с валидной кукой страницы и кошелёк работают;
- выход очищает куку.
