import { getJSON, setJSON, getItem, setItem, removeItem } from './storage';

export interface User {
  id: string;
  strapiId?: number;
  email: string;
  username: string;
  createdAt: string;
  avatar: string;
}

const USERS_KEY = 'ampligame_users';
const CURRENT_USER_KEY = 'ampligame_current_user';
const TOKEN_KEY = 'ampligame_jwt';
const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.-]{3,24}$/;

export function getCurrentUser(): User | null {
  const raw = getItem(CURRENT_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function getAllUsers(): User[] {
  return getJSON<User[]>(USERS_KEY, []);
}

export function saveAllUsers(users: User[]): void {
  setJSON(USERS_KEY, users);
}

function notifyAuthChange() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event('us:auth-changed'));
  }
}

function mapStrapiAuthError(rawMessage: string): string {
  const msg = String(rawMessage || '').toLowerCase();
  if (msg.includes('valid email')) {
    return 'Введите корректный email с доменом (например, player@mail.ru)';
  }
  if (msg.includes('already taken') || msg.includes('unique')) {
    return 'Такой логин или email уже занят — попробуйте другой';
  }
  if (msg.includes('invalid identifier') || msg.includes('invalid password')) {
    return 'Неверный логин/email или пароль';
  }
  if (msg.includes('password') && msg.includes('least')) {
    return 'Пароль должен содержать минимум 6 символов';
  }
  if (msg.includes('username') && msg.includes('least')) {
    return 'Имя пользователя должно содержать минимум 3 символа';
  }
  return rawMessage || 'Ошибка авторизации';
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
    const res = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: cleanUsername,
        email: cleanEmail,
        password,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: mapStrapiAuthError(data?.error?.message),
      };
    }

    if (data.jwt) {
      setItem(TOKEN_KEY, data.jwt);
    }

    const user: User = {
      id: String(data.user.id),
      strapiId: data.user.id,
      email: data.user.email,
      username: data.user.username,
      createdAt: data.user.createdAt || new Date().toISOString(),
      avatar: '/img/default-avatar.svg',
    };

    setItem(CURRENT_USER_KEY, JSON.stringify(user));
    notifyAuthChange();
    return { success: true, user };
  } catch {
    return {
      success: false,
      error: 'Не удалось связаться со Strapi (проверьте http://127.0.0.1:1337)',
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
    const res = await fetch(`${STRAPI_URL}/api/auth/local`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: cleanId, password }),
    });
    const data = await res.json();

    if (!res.ok) {
      return {
        success: false,
        error: mapStrapiAuthError(data?.error?.message),
      };
    }

    if (data.jwt) {
      setItem(TOKEN_KEY, data.jwt);
    }

    const user: User = {
      id: String(data.user.id),
      strapiId: data.user.id,
      email: data.user.email,
      username: data.user.username,
      createdAt: data.user.createdAt || new Date().toISOString(),
      avatar: '/img/default-avatar.svg',
    };

    setItem(CURRENT_USER_KEY, JSON.stringify(user));
    notifyAuthChange();
    return { success: true, user };
  } catch {
    return {
      success: false,
      error: 'Сервер Strapi недоступен',
    };
  }
}

export function logout(): void {
  removeItem(CURRENT_USER_KEY);
  removeItem(TOKEN_KEY);
  notifyAuthChange();
}
