/**
 * Защита приватных страниц (Next.js 16: middleware переименован в proxy).
 *
 * /library и /profile отдают HTML только при наличии httpOnly-куки сессии.
 * Без неё запрос перенаправляется на главную с ?auth=required — TopBar
 * открывает модалку входа и после успешного входа возвращает пользователя
 * на исходный адрес.
 *
 * Токен здесь только проверяется на наличие: его подпись и срок действия
 * валидирует Strapi в /api/auth/me и /api/wallet/*. Подделанная кука не даст
 * доступа к данным.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { AUTH_COOKIE_NAME } from '@/lib/authConstants';

const PROTECTED_PREFIXES = ['/library', '/profile'];

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtected(pathname)) {
    return NextResponse.next();
  }

  if (request.cookies.get(AUTH_COOKIE_NAME)?.value) {
    const response = NextResponse.next();
    // Приватный HTML не должен оседать в общих кэшах.
    response.headers.set('Cache-Control', 'private, no-store');
    return response;
  }

  const url = request.nextUrl.clone();
  const nextPath = `${pathname}${url.search}`;

  url.pathname = '/';
  url.search = '';
  url.searchParams.set('auth', 'required');
  url.searchParams.set('next', nextPath);

  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/library/:path*', '/profile/:path*'],
};
