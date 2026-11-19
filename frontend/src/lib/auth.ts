/**
 * Клиентская авторизация.
 *
 * Пароль отправляется только по HTTPS на собственный /api/auth/*, а JWT
 * Strapi живёт в httpOnly + SameSite=Strict куке и недоступен из JavaScript.
 * В localStorage остаётся лишь кэш публичного профиля для отрисовки UI.
 */

import { getItem, setItem, removeItem } from './storage';

export interface User {
  id: string;
  strapiId?: number;
  email: string;
  username: string;
  createdAt: string;
  avatar: string;
}

const CURRENT_USER_KEY = 'ampligame_current_user';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,24}$/;

interface AuthResponse {
  user?: User;
  error?: { message?: string };
}

export function getCurrentUser(): User | null {
  const raw = getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('us:auth-changed'));
  }
}

function cacheUser(user: User): void {
  setItem(CURRENT_USER_KEY, JSON.stringify(user));
  notifyAuthChange();
}

function clearUser(): void {
  removeItem(CURRENT_USER_KEY);
  notifyAuthChange();
}

async function postAuth(path: string, body: Record<string, unknown>): Promise<AuthResponse> {
  const res = await fetch(`/api/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    credentials: 'same-origin',
    cache: 'no-store',
  });
  return (await res.json().catch(() => ({}))) as AuthResponse;
}

export async function register(
  email: string,
  username: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanUsername = username.trim();

  if (!USERNAME_REGEX.test(cleanUsername)) {
    return {
      success: false,
      error: 'Никнейм: 3–24 символа (латиница, цифры, _ или -)',
    };
  }
  if (!EMAIL_REGEX.test(cleanEmail)) {
    return {
      success: false,
      error: 'Введите корректный email (например, alex@mail.ru)',
    };
  }
  if (password.length < 6) {
    return {
      success: false,
      error: 'Пароль должен содержать минимум 6 символов',
    };
  }

  try {
    const data = await postAuth('register', {
      username: cleanUsername,
      email: cleanEmail,
      password,
    });

    if (!data.user) {
      return {
        success: false,
        error: data.error?.message || 'Не удалось создать аккаунт',
      };
    }

    cacheUser(data.user);
    return { success: true, user: data.user };
  } catch {
    return {
      success: false,
      error: 'Не удалось связаться с сервером авторизации',
    };
  }
}

export async function login(
  identifier: string,
  password: string
): Promise<{ success: boolean; error?: string; user?: User }> {
  const cleanId = identifier.trim();
  if (!cleanId || !password) {
    return { success: false, error: 'Заполните логин/email и пароль' };
  }

  try {
    const data = await postAuth('login', { identifier: cleanId, password });

    if (!data.user) {
      return {
        success: false,
        error: data.error?.message || 'Не удалось выполнить вход',
      };
    }

    cacheUser(data.user);
    return { success: true, user: data.user };
  } catch {
    return {
      success: false,
      error: 'Сервер авторизации недоступен',
    };
  }
}

/** Завершает сессию: сервер удаляет httpOnly-куку. */
export async function logout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
    });
  } catch {
    /* даже при сетевой ошибке локальный кэш профиля нужно очистить */
  }
  clearUser();
}

/**
 * Сверяет кэш профиля с серверной сессией.
 * Вызывается при старте приложения: протухшая кука → пользователь разлогинен.
 */
export async function refreshCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch('/api/auth/me', {
      credentials: 'same-origin',
      cache: 'no-store',
    });

    if (!res.ok) {
      if (getItem(CURRENT_USER_KEY)) clearUser();
      return null;
    }

    const data = (await res.json().catch(() => ({}))) as AuthResponse;
    if (!data.user) {
      if (getItem(CURRENT_USER_KEY)) clearUser();
      return null;
    }

    cacheUser(data.user);
    return data.user;
  } catch {
    return getCurrentUser();
  }
}
