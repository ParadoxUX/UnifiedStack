/**
 * Серверная часть авторизации.
 *
 * JWT Strapi живёт только в httpOnly + SameSite=Strict куке. Браузерный
 * JavaScript токен не видит: клиент общается с /api/auth/*, а эти route
 * handlers уже сами ходят в Strapi и кладут токен в Set-Cookie.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_MAX_AGE, AUTH_COOKIE_NAME } from './authConstants';

export const STRAPI_URL =
  process.env.STRAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  'http://127.0.0.1:1337';

/** Поля пользователя Strapi, которые нам нужны. */
export interface StrapiUser {
  id?: number | string;
  email?: string;
  username?: string;
  createdAt?: string;
}

export interface StrapiAuthResponse {
  jwt?: string;
  user?: StrapiUser;
  error?: { message?: string };
}

export interface PublicUser {
  id: string;
  strapiId: number;
  email: string;
  username: string;
  createdAt: string;
  avatar: string;
}

/** Достаёт токен из httpOnly-куки (Authorization оставлен для e2e-тестов). */
export function getAuthToken(req: NextRequest): string | null {
  const cookieToken = req.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const header = req.headers.get('authorization') || '';
  if (header.startsWith('Bearer ')) {
    const value = header.slice(7).trim();
    if (value) return value;
  }
  return null;
}

/** Ставит JWT в httpOnly + SameSite=Strict куку. */
export function setAuthCookie(res: NextResponse, token: string): void {
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: AUTH_COOKIE_MAX_AGE,
  });
}

/** Удаляет куку сессии. */
export function clearAuthCookie(res: NextResponse): void {
  res.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.COOKIE_SECURE === 'true',
    path: '/',
    maxAge: 0,
  });
}

/** Приводит пользователя Strapi к безопасному публичному виду (без passwordHash). */
export function toPublicUser(raw?: StrapiUser): PublicUser {
  return {
    id: String(raw?.id ?? ''),
    strapiId: Number(raw?.id ?? 0),
    email: String(raw?.email ?? ''),
    username: String(raw?.username ?? ''),
    createdAt: raw?.createdAt || new Date().toISOString(),
    avatar: '/img/default-avatar.svg',
  };
}

/** Понятные пользователю сообщения об ошибках Strapi. */
export function mapStrapiAuthError(rawMessage?: string): string {
  const msg = String(rawMessage || '').toLowerCase();
  if (msg.includes('valid email')) {
    return 'Введите корректный email с доменом (например, player@mail.ru)';
  }
  if (msg.includes('already taken') || msg.includes('unique')) {
    return 'Такой логин или email уже занят — попробуйте другой';
  }
  if (msg.includes('invalid identifier') || msg.includes('invalid password')) {
    return 'Неверный логин/email или пароль';
  }
  if (msg.includes('password') && msg.includes('least')) {
    return 'Пароль должен содержать минимум 6 символов';
  }
  if (msg.includes('username') && msg.includes('least')) {
    return 'Имя пользователя должно содержать минимум 3 символа';
  }
  return rawMessage || 'Ошибка авторизации';
}

/** JSON-запрос к Strapi с сервера Next.js. */
export async function strapiJson<T>(
  path: string,
  init: RequestInit = {}
): Promise<{ ok: boolean; status: number; data: T | null }> {
  const res = await fetch(`${STRAPI_URL}/api${path}`, {
    ...init,
    cache: 'no-store',
  });
  const data = (await res.json().catch(() => null)) as T | null;
  return { ok: res.ok, status: res.status, data };
}
