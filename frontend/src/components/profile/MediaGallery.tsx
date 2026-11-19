"use client";

/**
 * Доступная медиа-галерея профиля.
 *
 * - миниатюры — настоящие <button>, а не div с onClick;
 * - просмотрщик — role="dialog" с aria-modal, закрытие по Escape;
 * - стрелки подписаны aria-label и видны при focus-visible;
 * - навигация с клавиатуры: ←/→, Home/End, Tab заперт внутри диалога;
 * - номер скриншота озвучивается через aria-live.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import Icon from "@/components/ui/Icon";
import { pluralScreenshots } from "@/lib/plural";

export interface GalleryScreenshot {
  id: number | string;
  src: string;
  date?: string;
}

export default function MediaGallery({
  screenshots,
  onRemove,
}: {
  screenshots: GalleryScreenshot[];
  onRemove: (index: number) => void;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);

  const isOpen =
    openIndex !== null && openIndex >= 0 && openIndex < screenshots.length;

  const close = useCallback(() => {
    setOpenIndex(null);
    // Возвращаем фокус на миниатюру, с которой открыли просмотр.
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  }, []);

  const goTo = useCallback(
    (index: number) => {
      if (screenshots.length === 0) return;
      setOpenIndex(((index % screenshots.length) + screenshots.length) % screenshots.length);
    },
    [screenshots.length]
  );

  const prev = useCallback(() => {
    setOpenIndex((current) =>
      current === null
        ? current
        : (current - 1 + screenshots.length) % screenshots.length
    );
  }, [screenshots.length]);

  const next = useCallback(() => {
    setOpenIndex((current) =>
      current === null ? current : (current + 1) % screenshots.length
    );
  }, [screenshots.length]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
        return;
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
        return;
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        goTo(0);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        goTo(screenshots.length - 1);
        return;
      }
      if (event.key === "Tab") {
        const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        );
        if (!nodes || nodes.length === 0) return;

        const focusable = Array.from(nodes);
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, close, prev, next, goTo, screenshots.length]);

  if (screenshots.length === 0) return null;

  const activeIndex = openIndex ?? 0;
  const active = screenshots[activeIndex];

  return (
    <>
      <div
        className="screenshots-grid"
        role="list"
        aria-label={`Скриншоты: ${pluralScreenshots(screenshots.length)}`}
      >
        {screenshots.map((img, index) => (
          <div className="screenshot" role="listitem" key={img.id ?? index}>
            <button
              type="button"
              className="screenshot-open"
              aria-label={`Открыть скриншот ${index + 1} из ${screenshots.length}`}
              aria-haspopup="dialog"
              onClick={(event) => {
                triggerRef.current = event.currentTarget;
                setOpenIndex(index);
              }}
            >
              <img
                src={img.src}
                alt={`Скриншот ${index + 1}${img.date ? ` от ${img.date}` : ""}`}
              />
            </button>
            <button
              type="button"
              className="profile-remove-btn"
              aria-label={`Удалить скриншот ${index + 1}`}
              onClick={() => onRemove(index)}
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {isOpen && active && (
        <div
          className="media-viewer-backdrop"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <div
            ref={dialogRef}
            className="media-viewer"
            role="dialog"
            aria-modal="true"
            aria-label="Просмотр скриншотов"
          >
            <button
              ref={closeRef}
              type="button"
              className="media-viewer-close"
              aria-label="Закрыть просмотр"
              onClick={close}
            >
              <Icon name="close" size={20} />
            </button>

            <button
              type="button"
              className="media-viewer-arrow media-viewer-prev"
              aria-label="Предыдущий скриншот"
              onClick={prev}
            >
              <Icon name="chevron" size={28} />
            </button>

            <figure className="media-viewer-figure">
              <img
                src={active.src}
                alt={`Скриншот ${activeIndex + 1} из ${screenshots.length}`}
              />
              <figcaption className="media-viewer-caption" aria-live="polite" aria-atomic="true">
                Скриншот {activeIndex + 1} из {screenshots.length}
              </figcaption>
            </figure>

            <button
              type="button"
              className="media-viewer-arrow media-viewer-next"
              aria-label="Следующий скриншот"
              onClick={next}
            >
              <Icon name="chevron" size={28} />
            </button>

            <div className="media-viewer-thumbs" role="group" aria-label="Миниатюры скриншотов">
              {screenshots.map((img, index) => (
                <button
                  key={img.id ?? index}
                  type="button"
                  className={`media-viewer-thumb ${index === activeIndex ? "active" : ""}`}
                  aria-label={`Скриншот ${index + 1} из ${screenshots.length}`}
                  aria-current={index === activeIndex ? "true" : undefined}
                  onClick={() => setOpenIndex(index)}
                >
                  <img src={img.src} alt="" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
