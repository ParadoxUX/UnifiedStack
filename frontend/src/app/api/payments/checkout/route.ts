/**
 * Демо-чекаут для локальной витрины.
 *
 * В проде пополнение идёт только через вебхук реального платёжного провайдера.
 * Включается явно переменной DEMO_PAYMENTS=true. Пользователь определяется
 * по httpOnly cookie (или Bearer JWT) через Strapi /api/users/me.
 */

import { createHmac, randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthToken, STRAPI_URL } from '@/lib/serverAuth';

export async function POST(req: NextRequest) {
  if (process.env.DEMO_PAYMENTS !== 'true') {
    return NextResponse.json(
      { error: { message: 'Пополнение доступно только через платёжного провайдера' } },
      { status: 403 }
    );
  }

  const token = getAuthToken(req);
  if (!token) {
    return NextResponse.json(
      { error: { message: 'Требуется авторизация' } },
      { status: 401 }
    );
  }

  const secret = process.env.PAYMENT_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: { message: 'Платёжный webhook не настроен' } },
      { status: 503 }
    );
  }

  const { amount } = (await req.json().catch(() => ({}))) as { amount?: number };
  const value = Number(amount);
  if (!Number.isInteger(value) || value <= 0 || value > 1_000_000) {
    return NextResponse.json(
      { error: { message: 'Некорректная сумма пополнения' } },
      { status: 400 }
    );
  }

  const meRes = await fetch(`${STRAPI_URL}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!meRes.ok) {
    return NextResponse.json(
      { error: { message: 'Не удалось определить пользователя' } },
      { status: 401 }
    );
  }
  const user = (await meRes.json()) as { id?: number };
  if (!user.id) {
    return NextResponse.json(
      { error: { message: 'Не удалось определить пользователя' } },
      { status: 401 }
    );
  }

  const body = JSON.stringify({ userId: user.id, amount: value });
  const eventId = `demo_${randomUUID()}`;
  const signature =
    'sha256=' + createHmac('sha256', secret).update(body).digest('hex');

  const res = await fetch(`${STRAPI_URL}/api/payments/webhook`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-payment-event-id': eventId,
      'x-payment-signature': signature,
    },
    body,
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
