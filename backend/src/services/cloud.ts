/**
 * Облачная сессия в стиле компьютерного клуба.
 *
 * - timed  — платим за выбранное время, получаем endsAt и таймер;
 *            при досрочном окончании неизрасходованные минуты возвращаются.
 * - account — разовый платёж за постоянный доступ без таймера.
 *
 * Все деньги идут через walletService: списание и возврат идемпотентны.
 */

import type { Core } from '@strapi/strapi';
import { errors } from '@strapi/utils';

import { walletService } from './wallet';

const { ApplicationError } = errors;

/** Цена постоянного аккаунта (отдельного тарифа нет). */
const ACCOUNT_PRICE = 3990;
const ALLOWED_MINUTES = [30, 60, 180, 360, 720, 1440];

const UID = 'api::cloud-session.cloud-session';

function findTariff(strapi: Core.Strapi, id: string | number) {
  return strapi.db.query('api::tariff.tariff').findOne({
    where: { $or: [{ documentId: id }, { id: Number(id) || -1 }] },
  });
}

async function activeSession(strapi: Core.Strapi, userId: number | string) {
  const sessions = await strapi.db.query(UID).findMany({
    where: { user: { id: userId }, status: 'active' },
    populate: { tariff: true, game: true },
    orderBy: { createdAt: 'desc' },
    limit: 5,
  });

  const now = Date.now();
  const valid = sessions.filter(
    (s: any) => s.kind === 'account' || !s.endsAt || new Date(s.endsAt).getTime() > now
  );

  // Просроченные помечаем, чтобы не блокировали запуск новой сессии.
  for (const s of sessions) {
    if (!valid.includes(s)) {
      await strapi.db.query(UID).update({ where: { id: s.id }, data: { status: 'expired' } });
    }
  }

  return valid[0] ?? null;
}

async function startSession(
  strapi: Core.Strapi,
  args: {
    userId: number | string;
    tariffId: string | number;
    minutes: number;
    server: string;
    kind: 'timed' | 'account';
  }
) {
  const minutes = Number(args.minutes);
  const kind = args.kind === 'account' ? 'account' : 'timed';

  if (kind === 'timed' && !ALLOWED_MINUTES.includes(minutes)) {
    throw new ApplicationError('Недопустимая длительность сессии');
  }

  const tariff = await findTariff(strapi, args.tariffId);
  if (!tariff) throw new ApplicationError('Тариф не найден');

  const already = await activeSession(strapi, args.userId);
  if (already) {
    throw new ApplicationError('У вас уже есть активная сессия');
  }

  const hourPrice = Number(tariff.Price ?? 0);
  const price = kind === 'account' ? ACCOUNT_PRICE : Math.round((hourPrice * minutes) / 60);
  if (!Number.isFinite(price) || price < 0) {
    throw new ApplicationError('Некорректная стоимость сессии');
  }

  const reference = `cloud_${args.userId}_${Date.now()}`;
  const charged = await walletService.withdraw(strapi, {
    userId: args.userId,
    amount: price,
    reference,
  });

  const now = new Date();
  const endsAt = kind === 'account' ? null : new Date(now.getTime() + minutes * 60_000);

  const session = await strapi.db.query(UID).create({
    data: {
      user: args.userId,
      tariff: tariff.id,
      kind,
      minutesTotal: kind === 'account' ? 0 : minutes,
      minutesLeft: kind === 'account' ? 0 : minutes,
      startedAt: now,
      endsAt,
      status: 'active',
      server: args.server || 'EU-Central',
      reference,
    },
  });

  return { session, balance: charged.balance, price };
}

async function stopSession(strapi: Core.Strapi, userId: number | string) {
  const session = await activeSession(strapi, userId);
  if (!session) throw new ApplicationError('Активной сессии нет');
  if (session.kind === 'account') {
    throw new ApplicationError('Постоянный аккаунт нельзя остановить');
  }

  const now = Date.now();
  const left = Math.max(0, Math.ceil((new Date(session.endsAt).getTime() - now) / 60_000));
  const hourPrice = Number(session.tariff?.Price ?? 0);
  const refund = Math.round((hourPrice * left) / 60);

  await strapi.db.query(UID).update({
    where: { id: session.id },
    data: { status: 'stopped', minutesLeft: left },
  });

  let balance = (await walletService.ensureWallet(strapi, userId)).balance;
  if (refund > 0) {
    const returned = await walletService.deposit(strapi, {
      userId,
      amount: refund,
      reference: `cloud_refund_${session.reference}`,
    });
    balance = returned.balance;
  }

  return { refund, minutesLeft: left, balance };
}

async function history(strapi: Core.Strapi, userId: number | string) {
  return strapi.db.query(UID).findMany({
    where: { user: { id: userId } },
    populate: { tariff: true, game: true },
    orderBy: { createdAt: 'desc' },
    limit: 20,
  });
}

async function selectGame(
  strapi: Core.Strapi,
  userId: number | string,
  gameId: string | number
) {
  const session = await activeSession(strapi, userId);
  if (!session) throw new ApplicationError('Сначала запустите сессию');

  const game = await strapi.db.query('api::game.game').findOne({
    where: { $or: [{ documentId: gameId }, { id: Number(gameId) || -1 }] },
  });
  if (!game) throw new ApplicationError('Игра не найдена');

  await strapi.db.query(UID).update({ where: { id: session.id }, data: { game: game.id } });
  return { session: { ...session, game }, game };
}

export const cloudService = {
  startSession,
  activeSession,
  stopSession,
  history,
  selectGame,
  ACCOUNT_PRICE,
};
