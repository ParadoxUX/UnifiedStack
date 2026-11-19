/**
 * POST /api/auth/login
 *
 * Проксирует вход в Strapi и кладёт JWT в httpOnly + SameSite=Strict куку.
 * В теле ответа токена нет — JavaScript его не получает.
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  mapStrapiAuthError,
  setAuthCookie,
  strapiJson,
  toPublicUser,
  type StrapiAuthResponse,
} from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as
    | { identifier?: string; password?: string }
    | null;

  const identifier = String(body?.identifier ?? '').trim();
  const password = String(body?.password ?? '');

  if (!identifier || !password) {
    return NextResponse.json(
      { error: { message: 'Заполните логин/email и пароль', status: 400 } },
      { status: 400 }
    );
  }

  try {
    const { ok, status, data } = await strapiJson<StrapiAuthResponse>('/auth/local', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
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
      { error: { message: 'Сервер Strapi недоступен', status: 502 } },
      { status: 502 }
    );
  }
}
