import type { Core } from '@strapi/strapi';

const TABLES = [
  'games',
  'dlcs',
  'tariffs',
  'banners',
  'forum_categories',
  'forum_topics',
  'groups',
  'faqs',
  'contacts',
  'useful_links',
  'requirements',
];

/**
 * В Strapi v5 Content Manager отображает записи на основе draft-строк
 * (published_at IS NULL) с тем же document_id. Сидеры через db.query создают
 * только published-строки — эта функция аккуратно добавляет недостающие
 * draft-копии и привязывает их обложки (files_related_mph), чтобы вся витрина
 * отображалась в админке Strapi без потери данных.
 */
export async function ensureAdminDrafts(strapi: Core.Strapi) {
  const knex = strapi.db.connection;
  let totalAdded = 0;

  for (const table of TABLES) {
    const exists = await knex.schema.hasTable(table);
    if (!exists) continue;

    const hasDocId = await knex.schema.hasColumn(table, 'document_id');
    const hasPub = await knex.schema.hasColumn(table, 'published_at');
    if (!hasDocId || !hasPub) continue;

    const publishedRows = await knex(table).whereNotNull('published_at');
    if (!publishedRows.length) continue;

    const draftDocs = new Set(
      (await knex(table).select('document_id').whereNull('published_at')).map(
        (r: { document_id: string }) => r.document_id
      )
    );

    const hasMediaTable = await knex.schema.hasTable('files_related_mph');

    for (const row of publishedRows) {
      if (!row.document_id || draftDocs.has(row.document_id)) continue;

      const copy: Record<string, unknown> = { ...row };
      delete copy.id;
      copy.published_at = null;

      try {
        const inserted = await knex(table).insert(copy);
        const newId = Array.isArray(inserted) ? inserted[0] : inserted;
        draftDocs.add(row.document_id);
        totalAdded++;

        // Копируем связи медиа (обложки) на draft-строку, чтобы превью были видны в админке
        if (hasMediaTable && newId) {
          const mediaLinks = await knex('files_related_mph').where({ related_id: row.id });
          for (const link of mediaLinks) {
            const linkCopy: Record<string, unknown> = { ...link, related_id: newId };
            delete linkCopy.id;
            await knex('files_related_mph').insert(linkCopy).catch(() => {});
          }
        }
      } catch {
        // Если есть UNIQUE-ограничение на какое-то поле — пропускаем безопасно
      }
    }
  }

  if (totalAdded > 0) {
    strapi.log.info(`[admin-drafts] Добавлено draft-версий для Strapi Admin: ${totalAdded}`);
  }
}
