'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/ui/Icon';

export interface MediaSlide {
  type: 'video' | 'image';
  /** Прямая ссылка на mp4/webm, poster скриншота или ролик YouTube */
  src: string;
  /** Миниатюра для сетки справа */
  thumb?: string;
  /** Подпись в оверлее лайтбокса */
  caption?: string;
}

/** id ролика YouTube (watch / youtu.be / embed / shorts) либо null */
export function getYouTubeId(url: string): string | null {
  if (!url) return null;
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

export function isDirectVideo(url: string) {
  return /\.(mp4|webm|ogv|ogg|mov)(\?.*)?$/i.test(url);
}

function resolveThumb(slide: MediaSlide): string | null {
  if (slide.thumb && !isDirectVideo(slide.thumb)) return slide.thumb;
  if (slide.type === 'video') {
    const yt = getYouTubeId(slide.src);
    // Видео без постера НЕ подставляем в <img>: это даёт битые миниатюры.
    return yt ? `https://i.ytimg.com/vi/${yt}/hqdefault.jpg` : null;
  }
  return slide.src;
}

function isPlayableVideo(slide: MediaSlide): boolean {
  return slide.type === 'video' && (Boolean(getYouTubeId(slide.src)) || isDirectVideo(slide.src));
}

function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === 'INPUT' ||
    el.tagName === 'TEXTAREA' ||
    el.tagName === 'SELECT' ||
    Boolean(el.isContentEditable)
  );
}

export default function GameMediaGallery({
  slides,
  fallback,
  title,
}: {
  slides: MediaSlide[];
  /** Обложка игры — подставляется, если у игры нет ни роликов, ни скриншотов */
  fallback: string;
  title: string;
}) {
  // Сниппеты + скриншоты, без пустых ссылок
  const items = useMemo<MediaSlide[]>(() => {
    const cleaned = slides.filter((s) => Boolean(s?.src));
    if (cleaned.length > 0) return cleaned.slice(0, 12);
    return [{ type: 'image', src: fallback, thumb: fallback }];
  }, [slides, fallback]);

  const [active, setActive] = useState(0);
  // Сохраняем позицию воспроизведения, чтобы смена трейлера/скриншота не сбрасывала видео
  const playback = useRef<Record<number, number>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [lightbox, setLightbox] = useState(false);

  const current = items[Math.min(active, items.length - 1)];
  const ytId = current.type === 'video' ? getYouTubeId(current.src) : null;
  const playableVideo = isPlayableVideo(current);

  const go = useCallback(
    (dir: 1 | -1) => {
      setActive((prev) => (prev + dir + items.length) % items.length);
    },
    [items.length]
  );

  // Горячие клавиши как в Steam: ← → листают медиа, Esc закрывает лайтбокс.
  // Стрелки работают только когда фокус внутри галереи и не в поле ввода.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (lightbox) return;
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      if (isTypingTarget(e.target)) return;
      if (!stageRef.current?.contains(document.activeElement)) return;
      e.preventDefault();
      go(e.key === 'ArrowRight' ? 1 : -1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, lightbox]);

  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        setLightbox(false);
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        e.preventDefault();
        go(e.key === 'ArrowRight' ? 1 : -1);
      }
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [lightbox, go]);

  // Ставим курсор видео на сохранённую позицию (для скриншотов-«трейлеров» не портит вид)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const saved = playback.current[active];
    if (saved && saved > 0.5 && saved < (video.duration || Infinity)) {
      video.currentTime = saved;
    }
  }, [active, current]);

  const savePosition = () => {
    const video = videoRef.current;
    if (video) playback.current[active] = video.currentTime;
  };

  return (
    <>
      <div className="us-steam-showcase" ref={stageRef}>
        <div className="us-media-stage">
          {current.type === 'video' && !playableVideo ? (
            // Неизвестный источник НЕ отдаём в <img> — это битая картинка.
            <div className="us-media-unknown">
              <Icon name="play" size={28} />
              <span>Ролик доступен по внешней ссылке</span>
              <a href={current.src} target="_blank" rel="noopener noreferrer">
                Открыть ролик ↗
              </a>
            </div>
          ) : lightbox && current.type === 'video' ? (
            // Пока открыт лайтбокс, сцена НЕ держит второй плеер.
            <div className="us-media-paused" aria-hidden="true">
              {current.thumb && !isDirectVideo(current.thumb) ? (
                <img src={current.thumb} alt="" />
              ) : null}
              <span>
                <Icon name="play" size={18} /> Просмотр в полном экране
              </span>
            </div>
          ) : current.type === 'video' && ytId ? (
            <iframe
              key={`${ytId}-${active}`}
              className="us-media-video"
              src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0`}
              title={`${title} — трейлер`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : current.type === 'video' && isDirectVideo(current.src) ? (
            <video
              ref={videoRef}
              key={`${current.src}-${active}`}
              className="us-media-video"
              src={current.src}
              poster={current.thumb && !isDirectVideo(current.thumb) ? current.thumb : undefined}
              controls
              playsInline
              preload="metadata"
              onPause={savePosition}
              onTimeUpdate={savePosition}
            />
          ) : (
            <button
              type="button"
              className="us-media-image-btn"
              onClick={() => setLightbox(true)}
              aria-label={`Развернуть скриншот ${active + 1} из ${items.length}`}
            >
              <img src={current.src} alt={`${title} — скриншот ${active + 1}`} />
              <span className="us-media-hint">
                <Icon name="expand" size={14} /> Нажмите, чтобы увеличить
              </span>
            </button>
          )}

          {items.length > 1 && (
            <>
              <button
                type="button"
                className="us-media-nav prev"
                onClick={() => go(-1)}
                aria-label="Предыдущее медиа"
              >
                <Icon name="left" size={20} />
              </button>
              <button
                type="button"
                className="us-media-nav next"
                onClick={() => go(1)}
                aria-label="Следующее медиа"
              >
                <Icon name="right" size={20} />
              </button>
            </>
          )}
        </div>

        <div className="us-steam-showcase-bar">
          <span>
            {current.type === 'video' ? 'Трейлер игры' : 'Скриншоты'} · {active + 1} из {items.length}
          </span>
          <span>Цифровое издание • Мгновенная активация</span>
        </div>

        {/* Сетка миниатюр справа, как под галереей Steam */}
        <div className="us-media-thumbs" role="tablist" aria-label="Медиа игры">
          {items.map((slide, index) => {
            const kind = slide.type;
            const thumb = resolveThumb(slide);
            return (
              <button
                key={`${slide.type}-${slide.src}-${index}`}
                type="button"
                role="tab"
                aria-selected={index === active}
                className={`us-media-thumb ${index === active ? 'active' : ''} ${slide.type}`}
                onClick={() => setActive(index)}
                title={slide.caption || (slide.type === 'video' ? 'Трейлер' : `Скриншот ${index + 1}`)}
              >
                {thumb ? (
                  <img src={thumb} alt="" loading="lazy" />
                ) : (
                  <span className="us-media-thumb-empty">
                    <Icon name={kind === 'video' ? 'play' : 'image'} size={16} />
                  </span>
                )}
                {slide.type === 'video' && (
                  <span className="us-media-thumb-play">
                    <Icon name="play" size={14} />
                  </span>
                )}
                <span className="us-media-thumb-kind">
                  <Icon name={kind === 'video' ? 'play' : 'image'} size={11} />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {lightbox && (
        <div
          className="us-lightbox"
          onClick={(e) => e.target === e.currentTarget && setLightbox(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Просмотр медиа игры"
        >
          <button
            type="button"
            className="us-lightbox-close"
            onClick={() => setLightbox(false)}
            aria-label="Закрыть"
          >
            <Icon name="close" size={20} />
          </button>

          <div className="us-lightbox-body">
            {current.type === 'video' && !playableVideo ? (
              <div className="us-media-unknown">
                <Icon name="play" size={32} />
                <span>Ролик доступен по внешней ссылке</span>
                <a href={current.src} target="_blank" rel="noopener noreferrer">
                  Открыть ролик ↗
                </a>
              </div>
            ) : current.type === 'video' ? (
              <div className="us-lightbox-video" key={`light-${ytId ?? current.src}`}>
                {ytId ? (
                  <iframe
                    className="us-media-video"
                    src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&autoplay=1`}
                    title={`${title} — трейлер`}
                    allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
                    allowFullScreen
                  />
                ) : (
                  <video
                    className="us-media-video"
                    src={current.src}
                    poster={current.thumb && !isDirectVideo(current.thumb) ? current.thumb : undefined}
                    controls
                    autoPlay
                    playsInline
                  />
                )}
              </div>
            ) : (
              <img className="us-lightbox-img" src={current.src} alt={`${title} — скриншот ${active + 1}`} />
            )}

            <div className="us-lightbox-caption">
              {current.caption || (current.type === 'video' ? `${title} — трейлер` : `${title} — скриншот ${active + 1}`)}
            </div>
          </div>

          {items.length > 1 && (
            <>
              <button type="button" className="us-lightbox-nav prev" onClick={() => go(-1)} aria-label="Предыдущее">
                <Icon name="left" size={24} />
              </button>
              <button type="button" className="us-lightbox-nav next" onClick={() => go(1)} aria-label="Следующее">
                <Icon name="right" size={24} />
              </button>
              <div className="us-lightbox-dots">
                {items.map((slide, index) => (
                  <span
                    key={`dot-${index}`}
                    className={`us-lightbox-dot ${index === active ? 'active' : ''}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
