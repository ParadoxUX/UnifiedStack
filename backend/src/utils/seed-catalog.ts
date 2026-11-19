/**
 * Единый идемпотентный сид каталога.
 * Источник данных — src/data/catalog.json.
 * Автоматически подхватывает новые обложки из frontend/public/img/covers/*
 * и (при SYNC_CATALOG_FORCE=true или при первой миграции на covers/*)
 * синхронизирует актуальные цены Steam и баннеры.
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
const DUMMY_TITLES = ['Cyber Realm 2077', 'Neon Drift', 'Dungeon of Echoes', 'Stellar Vanguard'];

const MIME_MAP: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

async function uploadLocalCover(strapi: Core.Strapi, imgFileName: string, slugKey: string) {
  const cleanName = `cover_${slugKey}`;
  const existing = await strapi.db.query('plugin::upload.file').findOne({
    where: { name: cleanName },
  });
  if (existing) return existing;

  const fullPath = path.resolve(process.cwd(), '..', 'frontend', 'public', 'img', imgFileName);
  if (!fs.existsSync(fullPath)) return null;

  const stats = fs.statSync(fullPath);
  const ext = path.extname(imgFileName).toLowerCase();
  const mimeType = MIME_MAP[ext] || 'image/jpeg';

  const uploaded = await strapi.plugin('upload').service('upload').upload({
    files: {
      filepath: fullPath,
      originalFileName: `${cleanName}${ext}`,
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

export async function seedCatalog(strapi: Core.Strapi): Promise<number> {
  const forceSync = process.env.SYNC_CATALOG_FORCE === 'true';

  for (const title of DUMMY_TITLES) {
    const dummy = await strapi.db.query('api::game.game').findOne({ where: { Title: title } });
    if (dummy) {
      await strapi.db.query('api::game.game').delete({ where: { id: dummy.id } });
    }
  }

  const seeded: Array<{ id: number; coverId: number | null }> = [];
  let coversUpdated = 0;

  for (const item of CATALOG) {
    const cover = await uploadLocalCover(strapi, item.cover, item.slug);

    const existing =
      (await strapi.db.query('api::game.game').findOne({
        where: { slug: item.slug },
        populate: { Cover: true },
      })) ??
      (await strapi.db.query('api::game.game').findOne({
        where: { Title: item.title },
        populate: { Cover: true },
      }));

    if (existing) {
      const currentCoverName = existing.Cover?.name || '';
      const expectedCoverName = `cover_${item.slug}`;
      const needsCoverUpgrade = Boolean(cover?.id && currentCoverName !== expectedCoverName);

      const data: Record<string, unknown> = {};
      if (existing.slug !== item.slug) data.slug = item.slug;
      if (!existing.publishedAt) data.publishedAt = new Date();
      if (needsCoverUpgrade && cover?.id) {
        data.Cover = cover.id;
        coversUpdated++;
      }
      // При переходе на новые Steam-обложки или при SYNC_CATALOG_FORCE обновляем цены Steam
      if (needsCoverUpgrade || forceSync) {
        data.Price = item.price;
        data.oldPrice = item.oldPrice ?? null;
        data.isSale = Boolean(item.isSale);
      }

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

  // Пересоздаём баннеры, если их нет или обновились обложки
  const bannerCount = await strapi.db.query('api::banner.banner').count();
  if ((bannerCount === 0 || coversUpdated > 0 || forceSync) && seeded.length >= 10) {
    if (bannerCount > 0) {
      await strapi.db.query('api::banner.banner').deleteMany({ where: { id: { $gt: 0 } } });
    }
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

  console.log(`[catalog] Синхронизировано игр по slug: ${CATALOG.length} (обновлено обложек: ${coversUpdated})`);
  return CATALOG.length;
}

export default seedCatalog;
