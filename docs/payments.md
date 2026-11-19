# Деньги: пополнение, списание, покупки

Вся денежная логика живёт на бэкенде (`backend/src/services/wallet.ts`). Фронтенд только вызывает API — баланс в localStorage больше не хранится.

## Модель данных

| Тип | Таблица | Назначение |
|---|---|---|
| `Wallet` | `wallets` | баланс пользователя, 1:1 с `up_users` |
| `Transaction` | `transactions` | журнал: deposit / withdraw / purchase / refund |
| `LibraryItem` | `library_items` | купленные игры, статус `owned` / `installed` / `refunded` |

Статус игры после покупки: `purchaseCount + 1`, `lastPurchasedAt`, при заполненном `stock` уменьшается остаток, и при нуле `purchasable = false`.

## API

Все endpoint'ы требуют JWT пользователя: `Authorization: Bearer <token>` (JWT выдаёт `POST /api/auth/local` или `/api/auth/local/register`).

| Метод | Путь | Описание |
|---|---|---|
| GET | `/api/wallets/me` | кошелёк + последние 50 транзакций |
| POST | `/api/wallets/deposit` | `{ amount, reference? }` — пополнение |
| POST | `/api/wallets/withdraw` | `{ amount, reference? }` — списание |
| POST | `/api/wallets/purchase` | `{ gameId, reference? }` — покупка |
| GET | `/api/wallets/library` | библиотека пользователя |
| POST | `/api/wallets/reverse` | `{ reference }` — возврат/откат |

Фронтенд обращается к ним через серверный прокси Next.js: `/api/wallet/wallets/*` (`frontend/src/app/api/wallet/[...path]/route.ts`), который проверяет наличие JWT и пробрасывает запрос в Strapi.

Маршруты кошелька объявлены с `auth: false`, поэтому не зависят от состояния таблицы `up_permissions`. Пользователя определяет middleware `backend/src/middlewares/wallet-auth.ts` (проверяет JWT через сервис users-permissions и кладёт его в `ctx.state.user`), контроллер отвечает 401 без пользователя.

## Защита от двойного списания

Гарантии одинаковы на PostgreSQL и SQLite: ограничения накладываются при старте Strapi (`backend/src/migrations/wallet-constraints.ts`), миграция идемпотентна.

1. **Блокировка кошелька** внутри `strapi.db.transaction`:
   - PostgreSQL — `SELECT ... FOR UPDATE` на строке кошелька;
   - SQLite/MySQL — очередь операций по кошельку в процессе + условный `UPDATE` (в SQLite одно соединение, поэтому запись и так сериализуется).
2. **Условный `UPDATE`**: `WHERE id = ? AND balance = <прочитанный баланс>` — если баланс изменился, операция падает с ошибкой конфликта, а не перезаписывает чужое значение.
3. **UNIQUE `transactions.reference`** — повтор запроса с тем же ключом не списывает и не начисляет дважды (идемпотентность, в том числе при параллельных запросах).
4. **UNIQUE `library_items(wallet_id, game_id)`** — игру нельзя купить дважды. Strapi v5 хранит связи в link-таблицах, поэтому сервис заполняет денормализованные `wallet_id`/`game_id`, а уникальность обеспечивает индекс `library_items_wallet_game_unique`.
5. **UNIQUE `wallets.user`** — один кошелёк на пользователя (индекс `wallets_user_lnk_user_unique`), параллельное создание кошелька не плодит дубли.
6. **`CHECK (balance >= 0)`** — PostgreSQL CHECK-constraint; на SQLite — триггеры `wallets_balance_non_negative_insert/update`.
7. Один `strapi.db.transaction` на покупку: списание, запись в библиотеку и обновление статуса игры коммитятся вместе или откатываются вместе.

Если существующие данные нарушают ограничения (отрицательный баланс, дубли `reference`/покупок/кошельков), Strapi **не стартует** и пишет, что нужно исправить. «Молчаливого» пропуска ошибок (в т.ч. 23514) нет.

## Базы данных

| Клиент | Когда использовать | Как обеспечены ограничения |
|---|---|---|
| `sqlite` | разработка (по умолчанию) | UNIQUE-индексы + триггеры для `balance >= 0` |
| `postgres` | прод/стейдж (рекомендуется) | UNIQUE-индексы + `CHECK`-constraint |

Ограничения и индексы накладываются автоматически при старте Strapi (`bootstrap` → `runWalletMigration`).

### SQLite (по умолчанию)

В `.env` достаточно `DATABASE_CLIENT=sqlite` — файл `backend/.tmp/data.db` создаётся автоматически.

### PostgreSQL

В `config/database.ts` уже есть готовая конфигурация. В `.env`:

```
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=unifiedstack
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi
```

Быстрый старт локальной БД: `docker compose up -d` (сервис `postgres` в корне репозитория). Драйвер `pg` уже в зависимостях бэкенда.

## Проверка

```bash
# сиды (при остановленном Strapi)
cd backend && node scripts/seed-games.js

# ограничения БД на SQLite
node tests/constraints-e2e.js

# ограничения БД на PostgreSQL
# PowerShell:
$env:DATABASE_CLIENT='postgres'; node tests/constraints-e2e.js

# тесты денежной логики (по умолчанию http://127.0.0.1:1337)
node tests/money-e2e.js

# тот же e2e на другом инстансе (например, PostgreSQL на :1338)
$env:API_URL='http://127.0.0.1:1338'; node tests/money-e2e.js

# тест прокси Next.js (Next запущен на :3100)
cd frontend && node tests/proxy-e2e.js
```

`money-e2e.js` проверяет: пополнение, идемпотентность (в т.ч. параллельные deposit с одним `reference`), отказ при нехватке средств, **5 параллельных покупок одной игры — успешна ровно одна**, **две параллельные покупки разных игр — успешны обе**, библиотеку, статус игры (`purchaseCount`, `stock`, `lastPurchasedAt`), журнал и возврат. Результат одинаков на SQLite и PostgreSQL.

`constraints-e2e.js` проверяет наличие и реальную работу ограничений: `UNIQUE transactions.reference`, `UNIQUE wallets.user`, `UNIQUE library_items(wallet_id, game_id)`, `CHECK (balance >= 0)`.
