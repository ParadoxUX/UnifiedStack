/**
 * Серверный прокси записи в Strapi.
 *
 * Браузер → /api/strapi/<collection> → Strapi /api/<collection>.
 * JWT берётся из httpOnly-куки и подставляется уже на сервере, поэтому
 * клиентскому коду токен по-прежнему не нужен.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, STRAPI_URL } from '@/lib/serverAuth';

type Ctx = { params: Promise<{ path?: string[] }> };

async function proxy(req: NextRequest, ctx: Ctx) {
  const { path = [] } = await ctx.params;
  const target = `${STRAPI_URL}/api/${path.join('/')}${req.nextUrl.search}`;
  const token = getAuthToken(req);
  const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await req.text();

  try {
    const res = await fetch(target, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body || undefined,
      cache: 'no-store',
    });

    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { error: { message: `Strapi недоступен: ${message}`, status: 502 } },
      { status: 502 }
    );
  }
}

export async function GET(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}

export async function PUT(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return proxy(req, ctx);
}
