"use client";
import { useState } from "react";

export default function GameGallery({
  videoUrl,
  screenshots,
  mainImage,
}: {
  videoUrl: string | null;
  screenshots: string[];
  mainImage: string;
}) {
  // Собираем ТОЛЬКО видео и скриншоты (без обложки)
  const allMedia = [
    ...(videoUrl ? [{ type: "video" as const, src: videoUrl }] : []),
    ...screenshots.map((img) => ({ type: "image" as const, src: img })),
  ];

  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev + 1) % allMedia.length);
  };

  const prevSlide = (e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev - 1 + allMedia.length) % allMedia.length);
  };

  // Если нет ни видео, ни скриншотов — показываем обложку как заглушку
  if (allMedia.length === 0) {
    return (
      <div style={{ width: "100%" }}>
        <div
          style={{
            background: "#000",
            borderRadius: "8px",
            overflow: "hidden",
            height: "400px",
            width: "100%",
          }}
        >
          <img
            src={mainImage}
            alt="Game"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      </div>
    );
  }

  const current = allMedia[activeIndex];

  return (
    <div style={{ width: "100%" }}>
      {/* Главный экран (видео или картинка) */}
      <div
        style={{
          background: "#000",
          borderRadius: "8px",
          overflow: "hidden",
          marginBottom: "10px",
          height: "400px",
          width: "100%",
          position: "relative",
        }}
      >
        {current.type === "video" && videoUrl ? (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              overflow: "hidden",
            }}
          >
            <iframe
              src={videoUrl}
              title="Video"
              frameBorder="0"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture"
              style={{
                border: "none",
                position: "absolute",
                top: "50%",
                left: "50%",
                width: "100%",
                height: "100%",
                transform: "translate(-50%, -50%) scale(1.3)",
              }}
            />
          </div>
        ) : (
          <img
            src={current.src}
            alt="Game"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        )}

        {/* СТРЕЛКА ВЛЕВО */}
        {allMedia.length > 1 && (
          <button
            onClick={prevSlide}
            style={{
              position: "absolute",
              top: "50%",
              left: "10px",
              transform: "translateY(-50%)",
              background: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "20px",
              zIndex: 10,
            }}
          >
            ‹
          </button>
        )}

        {/* СТРЕЛКА ВПРАВО */}
        {allMedia.length > 1 && (
          <button
            onClick={nextSlide}
            style={{
              position: "absolute",
              top: "50%",
              right: "10px",
              transform: "translateY(-50%)",
              background: "rgba(0, 0, 0, 0.5)",
              color: "#fff",
              border: "none",
              borderRadius: "50%",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              fontSize: "20px",
              zIndex: 10,
            }}
          >
            ›
          </button>
        )}
      </div>

      {/* Лента миниатюр (без обложки) */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          overflowX: "auto",
          paddingBottom: "10px",
          width: "100%",
        }}
      >
        {allMedia.map((media, i) => (
          <div
            key={i}
            onClick={() => setActiveIndex(i)}
            style={{
              width: "120px",
              height: "68px",
              flexShrink: 0,
              cursor: "pointer",
              opacity: activeIndex === i ? 1 : 0.5,
              border:
                activeIndex === i
                  ? "2px solid #8f3ed1"
                  : "2px solid transparent",
              borderRadius: "6px",
              background: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all 0.2s",
              overflow: "hidden",
            }}
          >
            {media.type === "video" ? (
              <span style={{ color: "#fff", fontSize: "24px" }}>▶</span>
            ) : (
              <img
                src={media.src}
                alt={`Media ${i}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
