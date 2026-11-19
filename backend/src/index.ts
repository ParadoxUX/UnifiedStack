import type { Core } from '@strapi/strapi';
import { runWalletMigration } from './migrations/wallet-constraints';
import { seedCatalog } from './utils/seed-catalog';
import { seedCommunity } from './utils/seed-community';

const PUBLIC_PERMISSIONS: Array<{ api: string; singular: string; actions: string[] }> = [
  { api: 'games', singular: 'game', actions: ['find', 'findOne'] },
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

// Доступно только роли Authenticated (аноним создать тикет не может).
const AUTHENTICATED_ONLY_PERMISSIONS: Array<{
  api: string;
  singular: string;
  actions: string[];
}> = [{ api: 'support-tickets', singular: 'support-ticket', actions: ['create'] }];

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
  console.log('[seed] Добавлено облачных тарифов: 3');
}
async function ensureRolePermissions(
  strapi: Core.Strapi,
  roleType: string,
  permissions: Array<{ api: string; singular: string; actions: string[] }>
) {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({
    where: { type: roleType },
  });
  if (!role) return;

  const existing = await strapi.db.query('plugin::users-permissions.permission').findMany({
    where: { role: role.id },
  });
  const existingActions = new Set(existing.map((p: { action: string }) => p.action));

  const toCreate: Array<Promise<unknown>> = [];
  for (const { singular, actions } of permissions) {
    for (const action of actions) {
      const fullAction = `api::${singular}.${singular}.${action}`;
      if (existingActions.has(fullAction)) continue;
      toCreate.push(
        strapi.db.query('plugin::users-permissions.permission').create({
          data: { action: fullAction, role: role.id },
        })
      );
    }
  }
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
  const invalid = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { action: { $startsWith: 'api::' } } });

  const wrong = invalid.filter((p: { action: string }) => {
    const uid = p.action.split('.');
    return uid.length === 4 && uid[2].endsWith('s');
  });

  for (const p of wrong) {
    await strapi.db.query('plugin::users-permissions.permission').delete({ where: { id: (p as { id: number }).id } });
  }
}

export default {
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await runWalletMigration(strapi);
    await seedCatalog(strapi);
    await seedInitialTariffs(strapi);
    await seedCommunity(strapi);
    await cleanupInvalidPermissions(strapi);
    await ensureRolePermissions(strapi, 'public', PUBLIC_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', PUBLIC_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', AUTHENTICATED_ONLY_PERMISSIONS);
    // Убираем create из public у уже существующих БД.
    await revokeRolePermissions(strapi, 'public', [
      'api::support-ticket.support-ticket.create',
    ]);
  },
};
