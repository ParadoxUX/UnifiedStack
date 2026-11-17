'use client';

import { useState } from 'react';
import type { VideoSource } from '@/lib/media';

export interface Screenshot {
  url: string;
  alt: string;
}

interface GameMediaProps {
  title: string;
  trailer: VideoSource | null;
  screenshots: Screenshot[];
  cover: string;
}

/**
 * Медиа-блок страницы игры.
 *
 * Порядок: трейлер (видео по ссылке из админки) → галерея скриншотов.
 * Понимает вставки YouTube/Vimeo/Rutube/VK (iframe) и прямые ссылки на mp4.
 * Если видео нет — сверху показывается обложка, чтобы блок не «прыгал».
 */
export default function GameMedia({ title, trailer, screenshots, cover }: GameMediaProps) {
  const [lightbox, setLightbox] = useState<string | null>(null);

  const hasScreens = screenshots.length > 0;
  const poster = screenshots[0]?.url || cover;

  return (
    <div className="us-game-media">
      <div className="us-steam-showcase">
        {trailer ? (
          trailer.kind === 'iframe' ? (
            <iframe
              className="us-game-trailer"
              src={trailer.url}
              title={`${title} — трейлер`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
            />
          ) : (
            <video
              className="us-game-trailer"
              src={trailer.url}
              poster={poster}
              controls
              preload="metadata"
              playsInline
            >
              Ваш браузер не поддерживает воспроизведение видео.
            </video>
          )
        ) : (
          <img src={cover} alt={title} />
        )}

        <div className="us-steam-showcase-bar">
          <span>
            {trailer
              ? trailer.kind === 'iframe'
                ? `Трейлер · ${trailer.provider}`
                : 'Официальный трейлер'
              : hasScreens
                ? 'Скриншоты игры'
                : 'Цифровое издание • Мгновенная активация'}
          </span>
          <span>{hasScreens ? `${screenshots.length} скриншот(ов)` : 'PC'}</span>
        </div>
      </div>

      {hasScreens && (
        <div className="us-screens-grid">
          {screenshots.map((shot) => (
            <button
              key={shot.url}
              type="button"
              className="us-screen-thumb"
              onClick={() => setLightbox(shot.url)}
              aria-label={`Открыть скриншот: ${shot.alt}`}
            >
              <img src={shot.url} alt={shot.alt} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {lightbox && (
        <div
          className="us-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="us-lightbox-close"
            onClick={() => setLightbox(null)}
            aria-label="Закрыть"
          >
            ✕
          </button>
          <img
            src={lightbox}
            alt={`${title} — скриншот`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
