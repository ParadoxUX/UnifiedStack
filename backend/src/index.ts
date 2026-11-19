import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';
import { runWalletMigration } from './migrations/wallet-constraints';
import { seedCatalog } from './utils/seed-catalog';
import { seedCommunity } from './utils/seed-community';
import { ensureAdminDrafts } from './utils/ensure-drafts';

type PermissionGroup = { api: string; singular: string; actions: string[] };

const PUBLIC_PERMISSIONS: PermissionGroup[] = [
  { api: 'games', singular: 'game', actions: ['find', 'findOne'] },
  { api: 'dlcs', singular: 'dlc', actions: ['find', 'findOne'] },
  { api: 'banners', singular: 'banner', actions: ['find', 'findOne'] },
  { api: 'categories', singular: 'category', actions: ['find', 'findOne'] },
  { api: 'events', singular: 'event', actions: ['find', 'findOne'] },
  { api: 'tariffs', singular: 'tariff', actions: ['find', 'findOne'] },
  { api: 'streams', singular: 'stream', actions: ['find', 'findOne'] },
  { api: 'forum-categories', singular: 'forum-category', actions: ['find', 'findOne'] },
  { api: 'forum-topics', singular: 'forum-topic', actions: ['find', 'findOne', 'create'] },
  { api: 'forum-posts', singular: 'forum-post', actions: ['find', 'findOne', 'create'] },
  { api: 'support-tickets', singular: 'support-ticket', actions: ['find', 'findOne'] },
  { api: 'groups', singular: 'group', actions: ['find', 'findOne', 'create'] },
  { api: 'faqs', singular: 'faq', actions: ['find', 'findOne'] },
  { api: 'contacts', singular: 'contact', actions: ['find', 'findOne'] },
  { api: 'useful-links', singular: 'useful-link', actions: ['find', 'findOne'] },
  { api: 'requirements', singular: 'requirement', actions: ['find', 'findOne'] },
  { api: 'popular-topics', singular: 'popular-topic', actions: ['find', 'findOne'] },
];

// Публичный доступ к загруженным медиа: фронтенд берёт url обложек, скриншотов и видео.
const PUBLIC_UPLOAD_PERMISSIONS = [
  'plugin::upload.content-api.find',
  'plugin::upload.content-api.findOne',
];

// Доступно только роли Authenticated (аноним создать тикет не может).
const AUTHENTICATED_ONLY_PERMISSIONS: PermissionGroup[] = [
  { api: 'support-tickets', singular: 'support-ticket', actions: ['create'] },
];

const MIME_MAP: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const DLC_CATALOG = [
  {
    gameTitle: 'The Witcher 3',
    Title: 'The Witcher 3: Blood and Wine',
    Description: 'Новый регион Туссент, подземелья, турниры и история местной герцогини.',
    Price: 399,
    oldPrice: 799,
    img: 'covers/the-witcher-3.jpg',
  },
  {
    gameTitle: 'The Witcher 3',
    Title: 'The Witcher 3: Hearts of Stone',
    Description: 'Сюжетная кампания с новыми заданиями и знакомым лицом из прошлого.',
    Price: 249,
    oldPrice: 499,
    img: 'covers/the-witcher-3.jpg',
  },
  {
    gameTitle: 'Cyberpunk 2077',
    Title: 'Cyberpunk 2077: Phantom Liberty',
    Description: 'Шпионский сюжет в новом районе и новая ветка финала.',
    Price: 899,
    oldPrice: 1499,
    img: 'covers/cyberpunk-2077.jpg',
  },
  {
    gameTitle: 'Elden Ring',
    Title: 'Elden Ring: Shadow of the Erdtree',
    Description: 'Большое дополнение с новой картой, боссами и механиками.',
    Price: 1199,
    img: 'covers/elden-ring.jpg',
  },
  {
    gameTitle: 'GTA V',
    Title: 'GTA V: Criminal Enterprise Starter Pack',
    Description: 'Стартовый набор для GTA Online: бизнес, техника и игровая валюта.',
    Price: 499,
    oldPrice: 999,
    img: 'covers/gta-v.jpg',
  },
  {
    gameTitle: 'It Takes Two',
    Title: 'It Takes Two: Versailles Trials',
    Description: 'Дополнительные испытания и новые сцены для вдвоём.',
    Price: 199,
    img: 'covers/it-takes-two.jpg',
  },
];

async function uploadLocalCover(strapi: Core.Strapi, imgFileName: string) {
  const cleanName = path.parse(imgFileName).name;
  const existing = await strapi.db.query('plugin::upload.file').findOne({
    where: { name: cleanName },
  });
  if (existing) return existing;

  const fullPath = path.resolve(process.cwd(), '..', 'frontend', 'public', 'img', imgFileName);
  if (!fs.existsSync(fullPath)) return null;

  const stats = fs.statSync(fullPath);
  const ext = path.extname(imgFileName).toLowerCase();
  const mimeType = MIME_MAP[ext] || 'image/webp';

  const uploaded = await strapi.plugin('upload').service('upload').upload({
    files: {
      filepath: fullPath,
      originalFileName: imgFileName,
      size: stats.size,
      mimetype: mimeType,
    },
    data: {
      fileInfo: {
        name: cleanName,
        alternativeText: cleanName,
        caption: cleanName,
      },
    },
  });

  return Array.isArray(uploaded) ? uploaded[0] : uploaded;
}

async function seedDlcs(strapi: Core.Strapi) {
  for (const item of DLC_CATALOG) {
    const game = await strapi.db.query('api::game.game').findOne({ where: { Title: item.gameTitle } });
    const cover = await uploadLocalCover(strapi, item.img);
    const existing = await strapi.db.query('api::dlc.dlc').findOne({ where: { Title: item.Title } });

    const data = {
      Title: item.Title,
      Description: item.Description,
      Price: item.Price,
      oldPrice: item.oldPrice ?? null,
      game: game?.id ?? null,
      Cover: cover?.id ?? null,
      publishedAt: new Date(),
    };

    if (existing) {
      await strapi.db.query('api::dlc.dlc').update({ where: { id: existing.id }, data });
    } else {
      await strapi.db.query('api::dlc.dlc').create({ data });
    }
  }
  strapi.log.info(`[dlc] Синхронизировано дополнений: ${DLC_CATALOG.length}`);
}

async function seedInitialTariffs(strapi: Core.Strapi) {
  const count = await strapi.db.query('api::tariff.tariff').count();
  if (count > 0) return;

  const tariffs = [
    {
      Title: 'Start Cloud',
      Price: 49,
      features_list: 'Full HD 1080p • 60 FPS\nВидеокарта RTX 3060\nПоминутная тарификация\nОблачные сохранения UnifiedStack',
      publishedAt: new Date(),
    },
    {
      Title: 'Pro RTX 4080',
      Price: 89,
      features_list: 'Quad HD 2K • 120 FPS\nВидеокарта NVIDIA RTX 4080\nТрассировка лучей (DLSS 3.5)\nПриоритетная очередь без ожидания',
      publishedAt: new Date(),
    },
    {
      Title: 'Ultra 4K 120FPS',
      Price: 139,
      features_list: 'Ultra HD 4K • 120 FPS HDR\nФлагманский кластер RTX 4090\nНулевой пинг (серверы EU/RU)\nБезлимитная облачная сессия',
      publishedAt: new Date(),
    },
  ];

  for (const t of tariffs) {
    await strapi.db.query('api::tariff.tariff').create({ data: t });
  }
  strapi.log.info(`[seed] Добавлено облачных тарифов: ${tariffs.length}`);
}

async function ensureRolePermissions(
  strapi: Core.Strapi,
  roleType: string,
  permissions: PermissionGroup[],
  rawActions: string[] = []
) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  if (!role) return;

  const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: role.id },
  });
  const existingActions = new Set(existing.map((p: { action: string }) => p.action));

  const wanted = new Set<string>(rawActions);
  for (const { singular, actions } of permissions) {
    for (const action of actions) {
      wanted.add(`api::${singular}.${singular}.${action}`);
    }
  }

  const toCreate = [...wanted]
    .filter((action) => !existingActions.has(action))
    .map((action) =>
      strapi.db.query('plugin::users-permissions.permission').create({
        data: { action, role: role.id },
      })
    );

  await Promise.all(toCreate);
}

async function revokeRolePermissions(
  strapi: Core.Strapi,
  roleType: string,
  actions: string[]
) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  if (!role) return;

  for (const action of actions) {
    await strapi.db
      .query('plugin::users-permissions.permission')
      .delete({ where: { role: role.id, action } });
  }
}

async function cleanupInvalidPermissions(strapi: Core.Strapi) {
  const knownUids = new Set(
    Object.keys(strapi.contentTypes).filter((uid) => uid.startsWith('api::'))
  );

  const candidates = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { action: { $startsWith: 'api::' } } });

  const wrong = candidates.filter((p: { action: string }) => {
    const parts = p.action.split('.');
    if (parts.length !== 4) return false;
    if (knownUids.has(`${parts[0]}.${parts[1]}`)) return false;
    return parts[1].endsWith('s');
  });

  if (!wrong.length) return;

  await strapi.db.query('plugin::users-permissions.permission').deleteMany({
    where: { id: { $in: wrong.map((p: { id: number }) => p.id) } },
  });
  strapi.log.warn(`[permissions] Удалено некорректных прав: ${wrong.length}`);
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await runWalletMigration(strapi);
    await seedCatalog(strapi);
    await seedDlcs(strapi);
    await seedInitialTariffs(strapi);
    await seedCommunity(strapi);
    await ensureAdminDrafts(strapi);
    await cleanupInvalidPermissions(strapi);
    await ensureRolePermissions(strapi, 'public', PUBLIC_PERMISSIONS, PUBLIC_UPLOAD_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', PUBLIC_PERMISSIONS, PUBLIC_UPLOAD_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', AUTHENTICATED_ONLY_PERMISSIONS);
    await revokeRolePermissions(strapi, 'public', [
      'api::support-ticket.support-ticket.create',
    ]);
  },
};
