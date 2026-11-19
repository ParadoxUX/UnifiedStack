/**
 * Единый идемпотентный сид каталога.
 *
 * Источник данных — src/data/catalog.json (slug + поля игры). Сид можно
 * запускать сколько угодно раз: запись ищется по slug, поэтому дубликатов
 * не появляется. Старые записи, созданные до появления slug, находятся по
 * Title и получают slug при первом запуске.
 *
 * ВАЖНО: runtime-источник каталога — база данных. Фронтенд читает игры
 * только из Strapi, никаких параллельных списков игр в коде нет.
 */

import type { Core } from '@strapi/strapi';
import fs from 'fs';
import path from 'path';
import catalogData from '../data/catalog.json';

interface CatalogEntry {
  slug: string;
  title: string;
  price: number;
  oldPrice: number | null;
  isSale: boolean;
  developer: string;
  year: number;
  genre: string;
  platform: string;
  cover: string;
  description: string;
}

const CATALOG = catalogData as CatalogEntry[];

/** Заглушки из старого dev-сида, которых не должно быть в каталоге. */
const DUMMY_TITLES = ['Cyber Realm 2077', 'Neon Drift', 'Dungeon of Echoes', 'Stellar Vanguard'];

const MIME_MAP: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

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

/** Поля, которыми управляет сид. stock/purchasable/purchaseCount не трогаем. */
function catalogFields(item: CatalogEntry) {
  return {
    Title: item.title,
    slug: item.slug,
    Price: item.price,
    oldPrice: item.oldPrice ?? null,
    isSale: Boolean(item.isSale),
    Description: item.description,
    developer: item.developer,
    Genre: item.genre,
    Platform: item.platform || 'PC',
    game_year: item.year,
  };
}

/**
 * Создаёт отсутствующие игры и дозаполняет служебные поля существующих
 * (slug, публикация, обложка). Цены и описания в БД не перезаписываются:
 * после первого сида источник истины — база данных.
 * Возвращает количество игр в каталоге.
 */
export async function seedCatalog(strapi: Core.Strapi): Promise<number> {
  for (const title of DUMMY_TITLES) {
    const dummy = await strapi.db.query('api::game.game').findOne({ where: { Title: title } });
    if (dummy) {
      await strapi.db.query('api::game.game').delete({ where: { id: dummy.id } });
    }
  }

  const seeded: Array<{ id: number; coverId: number | null }> = [];

  for (const item of CATALOG) {
    const cover = await uploadLocalCover(strapi, item.cover);

    // Сначала ищем по slug (новый ключ), затем по Title (старые записи без slug).
    const existing =
      (await strapi.db.query('api::game.game').findOne({ where: { slug: item.slug } })) ??
      (await strapi.db.query('api::game.game').findOne({ where: { Title: item.title } }));

    if (existing) {
      // База — источник истины: существующие цены/описания не перезаписываем.
      // Дозаполняем только служебные поля (slug для старых записей, публикацию,
      // обложку), чтобы сид оставался идемпотентным и не ломал ручные правки.
      const data: Record<string, unknown> = {};
      if (existing.slug !== item.slug) data.slug = item.slug;
      if (!existing.publishedAt) data.publishedAt = new Date();
      if (cover?.id && !existing.Cover) data.Cover = cover.id;

      if (Object.keys(data).length > 0) {
        await strapi.db.query('api::game.game').update({
          where: { id: existing.id },
          data,
        });
      }
      seeded.push({ id: existing.id, coverId: cover?.id ?? existing.Cover?.id ?? null });
    } else {
      const created = await strapi.db.query('api::game.game').create({
        data: {
          ...catalogFields(item),
          stock: 50,
          purchasable: true,
          purchaseCount: 0,
          publishedAt: new Date(),
          ...(cover?.id ? { Cover: cover.id } : {}),
        },
      });
      seeded.push({ id: created.id, coverId: cover?.id ?? null });
    }
  }

  // Баннеры для слайдеров создаём только на пустой БД.
  const bannerCount = await strapi.db.query('api::banner.banner').count();
  if (bannerCount === 0 && seeded.length >= 10) {
    const gamesWithCovers = seeded.filter((g) => g.coverId !== null);
    for (let i = 0; i < Math.min(12, gamesWithCovers.length); i++) {
      const target = gamesWithCovers[i];
      await strapi.db.query('api::banner.banner').create({
        data: {
          Order: i + 1,
          IsTop: i < 6,
          Image: target.coverId,
          game: target.id,
          publishedAt: new Date(),
        },
      });
    }
  }

  console.log(`[catalog] Синхронизировано игр по slug: ${CATALOG.length}`);
  return CATALOG.length;
}

export default seedCatalog;
