/**
 * Серверный прокси денежного API Strapi.
 * JWT берётся из httpOnly-куки (или Authorization: Bearer).
 * Разрешены только операции из whitelist и тела до MAX_BODY_BYTES.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, STRAPI_URL } from '@/lib/serverAuth';

const MAX_BODY_BYTES = 8 * 1024;

const ALLOWED_ROUTES: Record<string, readonly string[]> = {
  GET: ["me", "library", "cloud/active", "cloud/history"],
  POST: ["withdraw", "purchase", "purchase-dlc", "reverse", "cloud/start", "cloud/stop", "cloud/game"],
};

type Ctx = { params: Promise<{ path?: string[] }> };

function errorResponse(message: string, status: number) {
  return NextResponse.json({ error: { message, status } }, { status });
}

function resolvePath(segments: string[]): string[] | null {
  const path = segments[0] === 'wallets' ? segments.slice(1) : segments;
  return path.length ? path : null;
}

function isAllowed(method: string, path: string[]): boolean {
  const allowed = ALLOWED_ROUTES[method];
  if (!allowed || path.length === 0) return false;
  return allowed.includes(path.join("/"));
}

async function proxy(req: NextRequest, ctx: Ctx) {
  const method = req.method.toUpperCase();
  const { path = [] } = await ctx.params;

  const resourcePath = resolvePath(path);
  if (!resourcePath) return errorResponse('Операция не поддерживается', 404);
  if (!isAllowed(method, resourcePath)) return errorResponse('Операция не поддерживается', 403);

  const token = getAuthToken(req);
  if (!token) return errorResponse('Требуется авторизация', 401);

  let body: string | undefined;
  if (method !== 'GET' && method !== 'HEAD') {
    const declared = Number(req.headers.get('content-length') || 0);
    if (declared > MAX_BODY_BYTES) return errorResponse('Слишком большой запрос', 413);

    body = await req.text();
    if (new TextEncoder().encode(body).byteLength > MAX_BODY_BYTES) {
      return errorResponse('Слишком большой запрос', 413);
    }
  }

  const query = req.nextUrl.search || '';
  const target = `${STRAPI_URL}/api/wallets/${resourcePath.join('/')}${query}`;

  try {
    const res = await fetch(target, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body || undefined,
      cache: 'no-store',
    });

    if (res.status === 401) return errorResponse('Сессия истекла, войдите заново', 401);

    const json = await res.json().catch(() => null);
    if (json === null) return errorResponse('Некорректный ответ сервера', 502);

    return NextResponse.json(json, { status: res.status });
  } catch (err) {
    console.error('[wallet-proxy]', err);
    return errorResponse('Сервис временно недоступен, повторите позже', 502);
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}
