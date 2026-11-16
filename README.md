# UnifiedStack

Игровая платформа, магазин цифровых копий и облачный гейминг: **Next.js 16** фронтенд + **Strapi v5** Headless CMS бэкенд.

## Структура проекта

- `backend/` — Strapi v5 CMS (API, JWT-авторизация, сервис кошелька, SQLite, автосид 30 игр и тарифов)
- `frontend/` — Next.js 16 + React 19 + TypeScript (витрина, страница игры в стиле Steam, библиотека, облако, профиль)
- `docs/` — документация платёжной системы (`docs/payments.md`)

## Требования

- Node.js `20+` (LTS)
- npm `10+`
- Git

## Точная инструкция по запуску

### 1. Клонирование репозитория

    git clone [https://github.com/ParadoxUX/UnifiedStack.git](https://github.com/ParadoxUX/UnifiedStack.git)
    cd UnifiedStack

### 2. Запуск бэкенда (Strapi v5 — порт 1337)

Откройте первый терминал и выполните:

    cd backend
    npm install
    copy .env.example .env
    npm run develop

- API: `http://localhost:1337`
- Админ-панель: `http://localhost:1337/admin` (при первом входе создайте локального администратора)
- При старте автоматически создаётся SQLite БД (`backend/.tmp/data.db`), загружаются 30 игр с обложками, баннеры и тарифы.

### 3. Запуск фронтенда (Next.js — порт 3000)

Откройте второй терминал и выполните:

    cd frontend
    npm install
    npm run dev

- Приложение откроется по адресу: `http://localhost:3000`
- При необходимости укажите URL бэкенда в `frontend/.env.local`: `NEXT_PUBLIC_STRAPI_URL=[http://127.0.0.1:1337](http://127.0.0.1:1337)`

## Сборка и тесты

    cd backend && npm run build
    cd ../frontend && npm run build
    cd ../backend && node tests/money-e2e.js
