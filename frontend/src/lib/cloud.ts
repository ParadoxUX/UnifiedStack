/**
 * Клиент облачных сессий «компьютерного клуба».
 * Все запросы идут через серверный прокси /api/wallet с httpOnly-кукой сессии.
 */

export interface CloudSession {
  id: number;
  documentId?: string;
  kind: 'timed' | 'account';
  status: 'active' | 'stopped' | 'expired';
  minutesTotal: number;
  minutesLeft: number;
  startedAt: string;
  endsAt: string | null;
  server: string;
  reference: string;
  tariff?: { id: number; Title?: string; Price?: number };
  game?: { id: number; Title?: string; Cover?: { url?: string } };
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/wallet/wallets/cloud${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
    cache: 'no-store',
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error?.message || json?.message || 'Ошибка запроса');
  }
  return json.data as T;
}

export function getActiveSession() {
  return call<{ session: CloudSession | null; accountPrice: number }>('/active');
}

export function startSession(data: {
  tariffId: string;
  minutes: number;
  server: string;
  kind: 'timed' | 'account';
}) {
  return call<{ session: CloudSession; balance: number; price: number }>('/start', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export function stopSession() {
  return call<{ refund: number; minutesLeft: number; balance: number }>('/stop', {
    method: 'POST',
  });
}

export function getSessionHistory() {
  return call<CloudSession[]>('/history');
}

export function selectSessionGame(gameId: string) {
  return call<{ session: CloudSession; game: { Title?: string } }>('/game', {
    method: 'POST',
    body: JSON.stringify({ gameId }),
  });
}
