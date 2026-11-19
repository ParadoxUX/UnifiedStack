/**
 * Общие константы авторизации.
 *
 * Файл не содержит серверного кода: его импортируют и proxy (middleware),
 * и route handlers, поэтому здесь только чистые значения.
 */

/** Имя httpOnly-куки, в которой сервер хранит JWT Strapi. */
export const AUTH_COOKIE_NAME = 'us_auth';

/** Время жизни сессии (7 дней). */
export const AUTH_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;
