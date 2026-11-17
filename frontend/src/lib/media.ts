/**
 * Утилиты для медиа из Strapi.
 *
 * Strapi отдаёт media-поле по-разному: объект, массив объектов или null.
 * Админ может загрузить в Cover/Trailer/Screenshots любой файл, поэтому
 * тип проверяется по mime — иначе <img> получает видео и ломает карточку.
 */

export const STRAPI_URL =
  process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

export interface StrapiMedia {
  url?: string;
  mime?: string;
  name?: string;
  alternativeText?: string | null;
  formats?: Record<string, { url?: string }> | null;
}

/** Приводит любое media-поле Strapi к массиву объектов. */
export function toMediaArray(value: unknown): StrapiMedia[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean) as StrapiMedia[];
  return [value as StrapiMedia];
}

/** Абсолютный URL файла Strapi. Относительные url (`/uploads/...`) дополняются хостом. */
export function mediaUrl(media?: StrapiMedia | null): string | null {
  const url = media?.url;
  if (!url) return null;
  if (/^(https?:)?\/\//i.test(url)) return url;
  return `${STRAPI_URL}${url.startsWith("/") ? "" : "/"}${url}`;
}

export function isVideo(media?: StrapiMedia | null): boolean {
  const mime = media?.mime || "";
  if (mime.startsWith("video/")) return true;
  // fallback: mime может быть не заполнен у старых записей
  return /\.(mp4|webm|ogv|ogg|mov|m4v|avi|mkv)$/i.test(media?.url || "");
}

export function isImage(media?: StrapiMedia | null): boolean {
  const mime = media?.mime || "";
  if (mime.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|avif|gif|svg|bmp)$/i.test(media?.url || "");
}

/** Первое изображение из media-поля (объект или массив). SVG Strapi отдаёт как файл — его тоже принимаем. */
export function imageUrl(value: unknown): string | null {
  for (const item of toMediaArray(value)) {
    if (isImage(item)) return mediaUrl(item);
  }
  return null;
}

/** Первое видео из media-поля. */
export function videoUrl(value: unknown): string | null {
  for (const item of toMediaArray(value)) {
    if (isVideo(item)) return mediaUrl(item);
  }
  return null;
}

/** Все изображения из media-поля, по порядку. */
export function imageUrls(value: unknown): string[] {
  return toMediaArray(value)
    .filter(isImage)
    .map(mediaUrl)
    .filter((u): u is string => Boolean(u));
}

/* ===== Видео по ссылке (компонент shared.video-link) ===== */

export type VideoSource =
  | { kind: "iframe"; url: string; provider: string }
  | { kind: "file"; url: string };

/**
 * Разбирает ссылку на видео из админки.
 * Понимает YouTube (watch/youtu.be/shorts/embed), Vimeo, Rutube, VK Video,
 * а также прямые ссылки на файл (mp4/webm/ogg).
 * Возвращает null, если ссылка пустая или не распознана.
 */
export function parseVideoLink(raw?: string | null): VideoSource | null {
  const value = (raw || "").trim();
  if (!value) return null;

  // Прямая ссылка на файл
  if (/\.(mp4|webm|ogv|ogg|m4v|mov)(\?.*)?$/i.test(value)) {
    return { kind: "file", url: value };
  }

  let url: URL;
  try {
    url = new URL(/^[a-z]+:\/\//i.test(value) ? value : `https://${value}`);
  } catch {
    return null;
  }

  const host = url.hostname.replace(/^www\./, "").toLowerCase();
  const path = url.pathname;

  // YouTube
  if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    let id = url.searchParams.get("v");
    if (!id && path.startsWith("/embed/")) id = path.split("/")[2];
    if (!id && path.startsWith("/shorts/")) id = path.split("/")[2];
    if (!id && path.startsWith("/live/")) id = path.split("/")[2];
    if (id) {
      return {
        kind: "iframe",
        provider: "YouTube",
        url: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      };
    }
  }
  if (host === "youtu.be") {
    const id = path.split("/").filter(Boolean)[0];
    if (id) {
      return {
        kind: "iframe",
        provider: "YouTube",
        url: `https://www.youtube-nocookie.com/embed/${id}?rel=0`,
      };
    }
  }

  // Vimeo
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const match = path.match(/(\d+)/);
    if (match) {
      return { kind: "iframe", provider: "Vimeo", url: `https://player.vimeo.com/video/${match[1]}` };
    }
  }

  // Rutube
  if (host === "rutube.ru") {
    const match = path.match(/\/(?:video|embed)\/([a-z0-9]+)/i);
    if (match) {
      return { kind: "iframe", provider: "Rutube", url: `https://rutube.ru/play/embed/${match[1]}` };
    }
  }

  // VK Video
  if (host === "vk.com" || host === "vkvideo.ru" || host === "m.vk.com") {
    const match = value.match(/video(-?\d+)_(\d+)/);
    if (match) {
      return { kind: "iframe", provider: "VK Video", url: `https://vk.com/video_ext.php?oid=${match[1]}&id=${match[2]}` };
    }
  }

  // Любой другой https-адрес: пробуем как iframe (например, собственный плеер)
  if (/^https?:\/\//i.test(value)) {
    return { kind: "iframe", provider: host, url: value };
  }

  return null;
}

/** Достаёт первую рабочую ссылку на видео из компонента Trailers [{url}, ...]. */
export function firstVideoLink(trailers: unknown): VideoSource | null {
  if (!Array.isArray(trailers)) return null;
  for (const item of trailers) {
    const source = parseVideoLink((item as { url?: string } | null)?.url);
    if (source) return source;
  }
  return null;
}

