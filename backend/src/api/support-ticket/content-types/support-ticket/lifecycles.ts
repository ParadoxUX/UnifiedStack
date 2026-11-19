/**
 * SupportTicket lifecycles.
 *
 * Автор, e-mail и номер тикета всегда формируются на сервере.
 * Значения из тела запроса игнорируются — их нельзя подделать.
 */

import { errors } from '@strapi/utils';

const { ApplicationError } = errors;

function currentUser() {
  const ctx = (global as any).strapi?.requestContext?.get?.();
  return ctx?.state?.user ?? null;
}

function displayName(user: any): string {
  if (!user) return '';

  // Пользователь users-permissions.
  if (user.username) return String(user.username);

  // Администратор Strapi.
  const full = [user.firstname, user.lastname].filter(Boolean).join(' ').trim();
  if (full) return full;

  return String(user.email ?? user.id ?? 'unknown');
}

/**
 * Номер тикета генерируется только на сервере.
 * Время в base36 + случайный суффикс, чтобы не было коллизий при массовом создании.
 */
function generateTicketNumber(): string {
  const time = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TK-${time}-${random}`;
}

export default {
  beforeCreate(event: any) {
    const { data } = event.params ?? {};
    if (!data) return;

    const user = currentUser();

    // Никогда не доверяем полям, которые клиент мог прислать в теле запроса.
    delete data.Author;
    delete data.ContactEmail;
    delete data.TicketNumber;

    if (!user) {
      // create доступен только роли Authenticated (и админке).
      throw new ApplicationError('Создание тикета доступно только авторизованным пользователям');
    }

    data.Author = displayName(user);
    data.ContactEmail = user.email ?? null;
    data.TicketNumber = generateTicketNumber();

    // Новый тикет всегда открыт.
    data.Status = 'open';
  },
};
