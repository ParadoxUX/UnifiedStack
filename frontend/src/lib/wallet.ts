/**
 * Клиент денежного API (кошелёк, транзакции, библиотека).
 *
 * Запросы идут через серверный прокси Next.js (/api/wallet/*), который
 * берёт JWT из httpOnly-куки и пробрасывает его в Strapi. Клиентский код
 * токен не читает и не хранит. Вся денежная логика и защита от двойного
 * списания — на бэкенде (backend/src/services/wallet.ts).
 */

export interface WalletTransaction {
  id: number;
  documentId?: string;
  type: "deposit" | "withdraw" | "purchase" | "refund";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  status: "pending" | "completed" | "failed" | "reversed";
  reference: string;
  createdAt: string;
}

export interface Wallet {
  id: number;
  documentId?: string;
  balance: number;
  currency: string;
  transactions?: WalletTransaction[];
}

export interface LibraryItem {
  id: number;
  documentId?: string;
  status: "owned" | "installed" | "refunded";
  pricePaid: number;
  purchasedAt: string;
  dlc?: { id: number; documentId?: string; Title?: string; Price?: number };
  game?: {
    id: number;
    documentId?: string;
    Title?: string;
    Price?: number;
  };
}

export class WalletError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/wallet${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    credentials: "same-origin",
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      json?.error?.message ||
      json?.message ||
      (res.status === 401 ? "Сессия истекла, войдите заново" : "Ошибка запроса");
    throw new WalletError(message, res.status);
  }
  return json.data as T;
}

export async function fetchWallet(): Promise<Wallet> {
  return request<Wallet>("/wallets/me");
}

export async function deposit(amount: number, _reference?: string): Promise<Wallet> {
  const res = await fetch("/api/payments/checkout", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new WalletError(
      json?.error?.message || json?.message || "Ошибка проведения платежа",
      res.status
    );
  }
  return json.data as Wallet;
}

export async function withdraw(amount: number, reference?: string): Promise<Wallet> {
  return request<Wallet>("/wallets/withdraw", {
    method: "POST",
    body: JSON.stringify({ amount, reference }),
  });
}

export async function purchaseGame(
  gameId: string | number,
  reference?: string
): Promise<{ balance: number; walletId: number; game?: any; libraryItem?: LibraryItem }> {
  return request("/wallets/purchase", {
    method: "POST",
    body: JSON.stringify({ gameId, reference }),
  });
}

export async function fetchLibrary(): Promise<LibraryItem[]> {
  return request<LibraryItem[]>("/wallets/library");
}

export async function fetchTransactions(): Promise<WalletTransaction[]> {
  const wallet = await fetchWallet();
  return wallet.transactions ?? [];
}

/** Покупка DLC — отдельная транзакция и отдельная запись в библиотеке. */
export async function purchaseDlc(dlcId: string | number, reference?: string): Promise<Wallet> {
  return request<Wallet>("/wallets/purchase-dlc", {
    method: "POST",
    body: JSON.stringify({
      dlcId,
      reference: reference ?? `dlc_${Date.now()}_${dlcId}`,
    }),
  });
}

/** Детерминированный ключ идемпотентности покупки. */
export function purchaseReference(userId: string, gameId: string | number): string {
  return `purchase_${userId}_${gameId}`;
}
