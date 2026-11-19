/**
 * GET /api/auth/me — проверяет httpOnly-куку и возвращает профиль Strapi.
 *
 * Если токен просрочен или отозван, кука очищается, ответ — 401.
 */

import { NextRequest, NextResponse } from 'next/server';
import { clearAuthCookie, getAuthToken, strapiJson, toPublicUser, type StrapiUser } from '@/lib/serverAuth';

export async function GET(req: NextRequest) {
  const token = getAuthToken(req);
  if (!token) {
    return NextResponse.json(
      { error: { message: 'Требуется авторизация', status: 401 } },
      { status: 401 }
    );
  }

  try {
    const { ok, status, data } = await strapiJson<StrapiUser>('/users/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!ok || !data?.id) {
      const response = NextResponse.json(
        { error: { message: 'Сессия истекла, войдите заново', status: 401 } },
        { status: 401 }
      );
      if (status === 401 || status === 403) clearAuthCookie(response);
      return response;
    }

    return NextResponse.json({ user: toPublicUser(data) });
  } catch {
    return NextResponse.json(
      { error: { message: 'Сервер Strapi недоступен', status: 502 } },
      { status: 502 }
    );
  }
}
