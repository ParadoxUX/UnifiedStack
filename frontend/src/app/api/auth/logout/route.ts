/**
 * POST /api/auth/logout — удаляет httpOnly-куку сессии.
 */

import { NextResponse } from 'next/server';
import { clearAuthCookie } from '@/lib/serverAuth';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAuthCookie(response);
  return response;
}
