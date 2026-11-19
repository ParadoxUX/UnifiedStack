/**
 * POST /api/auth/register
 *
 * Регистрирует пользователя в Strapi и сразу открывает сессию:
 * JWT уходит в httpOnly + SameSite=Strict куку, в JSON — только профиль.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  mapStrapiAuthError,
  setAuthCookie,
  strapiJson,
  toPublicUser,
  type StrapiAuthResponse,
} from '@/lib/serverAuth';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,24}$/;

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { email?: string; username?: string; password?: string }
    | null;

  const email = String(body?.email ?? '').trim().toLowerCase();
  const username = String(body?.username ?? '').trim();
  const password = String(body?.password ?? '');

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      {
        error: {
          message: 'Никнейм: 3–24 символа (латиница, цифры, _ или -)',
          status: 400,
        },
      },
      { status: 400 }
    );
  }
  if (!EMAIL_REGEX.test(email)) {
    return NextResponse.json(
      { error: { message: 'Введите корректный email (например, alex@mail.ru)', status: 400 } },
      { status: 400 }
    );
  }
  if (password.length < 6) {
    return NextResponse.json(
      { error: { message: 'Пароль должен содержать минимум 6 символов', status: 400 } },
      { status: 400 }
    );
  }

  try {
    const { ok, status, data } = await strapiJson<StrapiAuthResponse>('/auth/local/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password }),
    });

    if (!ok || !data?.jwt || !data?.user) {
      const code = status && status >= 400 ? status : 400;
      return NextResponse.json(
        {
          error: {
            message: mapStrapiAuthError(data?.error?.message),
            status: code,
          },
        },
        { status: code }
      );
    }

    const response = NextResponse.json({ user: toPublicUser(data.user) });
    setAuthCookie(response, data.jwt);
    return response;
  } catch {
    return NextResponse.json(
      {
        error: {
          message: 'Не удалось связаться со Strapi (проверьте http://127.0.0.1:1337)',
          status: 502,
        },
      },
      { status: 502 }
    );
  }
}
