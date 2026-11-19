# UnifiedStack

Цифровая игровая платформа: магазин игр и DLC, библиотека, защищённый кошелёк, облачный ПК-клуб и разделы сообщества.

## Стек

| Слой | Технологии |
| :--- | :--- |
| Frontend | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| Backend / CMS | Strapi v5, TypeScript, Knex, `koa-ratelimit` |
| База данных | SQLite (`better-sqlite3`, локально) / PostgreSQL (production) |
| Авторизация | `httpOnly` + `SameSite=Strict` cookie-сессия поверх JWT Strapi |

## Требования

- Node.js `>= 20.x`
- npm `>= 10.x`
- Git

## Быстрый старт (локально)

### 1. Клонирование и установка зависимостей

```bash
git clone <URL_РЕПОЗИТОРИЯ> UnifiedStack
cd UnifiedStack

(cd backend && npm install)
(cd frontend && npm install)
