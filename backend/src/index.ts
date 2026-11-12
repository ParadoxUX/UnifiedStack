import type { Core } from '@strapi/strapi';
import { runWalletMigration } from './migrations/wallet-constraints';
import { seedCommunity } from './utils/seed-community';

/**
 * Права для разделов Community и Supports.
 * Тикеты и темы форума: чтение + создание (автор определяется по email).
 * Остальные коллекции — только чтение, если БД была создана без сидов.
 *
 * Ключ — папка API, singular — имя контент-типа из schema.json
 * (в UID действия используется именно singularName).
 */
const PUBLIC_PERMISSIONS: Array<{ api: string; singular: string; actions: string[] }> = [
  { api: 'forum-categories', singular: 'forum-category', actions: ['find', 'findOne'] },
  { api: 'forum-topics', singular: 'forum-topic', actions: ['find', 'findOne', 'create'] },
  { api: 'forum-posts', singular: 'forum-post', actions: ['find', 'findOne', 'create'] },
  { api: 'support-tickets', singular: 'support-ticket', actions: ['find', 'findOne', 'create'] },
  { api: 'groups', singular: 'group', actions: ['find', 'findOne', 'create'] },
  { api: 'faqs', singular: 'faq', actions: ['find', 'findOne'] },
  { api: 'contacts', singular: 'contact', actions: ['find', 'findOne'] },
  { api: 'useful-links', singular: 'useful-link', actions: ['find', 'findOne'] },
  { api: 'requirements', singular: 'requirement', actions: ['find', 'findOne'] },
  { api: 'popular-topics', singular: 'popular-topic', actions: ['find', 'findOne'] },
];

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
  for (const { api, singular, actions } of permissions) {
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

/**
 * Удаляет права, созданные с неверным форматом UID (по множественному имени),
 * например "api::forum-categories.forum-categories.find".
 */
async function cleanupInvalidPermissions(strapi: Core.Strapi) {
  const invalid = await strapi.db
    .query('plugin::users-permissions.permission')
    .findMany({ where: { action: { $startsWith: 'api::' } } });

  const wrong = invalid.filter((p: { action: string }) => {
    const uid = p.action.split('.');
    // Правильный формат: api::<singular>.<singular>.<action> — вторая часть не оканчивается на "s"
    return uid.length === 4 && uid[2].endsWith('s');
  });

  for (const p of wrong) {
    await strapi.db.query('plugin::users-permissions.permission').delete({ where: { id: (p as { id: number }).id } });
  }
  if (wrong.length > 0) {
    console.log(`[permissions] удалено некорректных прав: ${wrong.length}`);
  }
}

export default {
  register(/* { strapi }: { strapi: Core.Strapi } */) {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await runWalletMigration(strapi);
    await seedCommunity(strapi);
    await cleanupInvalidPermissions(strapi);
    await ensureRolePermissions(strapi, 'public', PUBLIC_PERMISSIONS);
    await ensureRolePermissions(strapi, 'authenticated', PUBLIC_PERMISSIONS);
  },
};
