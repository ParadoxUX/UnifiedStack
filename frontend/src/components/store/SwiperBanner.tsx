"use client";

import { useEffect, useState } from "react";
import { fetchBanners } from "@/lib/strapi";
import QuickViewModal from "./QuickViewModal";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

interface BannerItem {
  image: string;
  game: any;
}

export default function SwiperBanner() {
  const [topItems, setTopItems] = useState<BannerItem[]>([]);
  const [bottomItems, setBottomItems] = useState<BannerItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGame, setSelectedGame] = useState<any>(null);

  useEffect(() => {
    fetchBanners()
      .then((data) => {
        if (!Array.isArray(data) || data.length === 0) return;

        const sorted = [...data].sort((a: any, b: any) => (a.Order || 0) - (b.Order || 0));

        const mapToItem = (b: any): BannerItem => {
          const url = b?.Image?.url || b?.Image?.[0]?.url || b?.game?.Cover?.url;
          return {
            image: url ? `${STRAPI_URL}${url}` : "",
            game: b.game || null,
          };
        };

        const valid = sorted.map(mapToItem).filter((i) => i.image);
        const top = sorted.filter((b: any) => b.IsTop === true).map(mapToItem).filter((i) => i.image);
        const bottom = sorted.filter((b: any) => b.IsTop === false).map(mapToItem).filter((i) => i.image);

        setTopItems(top.length > 0 ? top : valid.slice(0, Math.ceil(valid.length / 2)));
        setBottomItems(bottom.length > 0 ? bottom : valid.slice(Math.ceil(valid.length / 2)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="us-banner-skeleton">
        <div className="us-skel-box us-skel-row" />
        <div className="us-skel-box us-skel-row" />
      </div>
    );
  }

  if (topItems.length === 0 && bottomItems.length === 0) return null;

  const handleBannerClick = (item: BannerItem) => {
    if (!item.game) return;
    const priceNum = item.game.Price ?? 0;
    const oldPrice = item.game.oldPrice || null;

    setSelectedGame({
      id: item.game.documentId || item.game.id,
      title: item.game.Title || "Без названия",
      price: `${priceNum} ₽`,
      priceNum,
      oldPrice,
      isSale: Boolean(item.game.isSale),
      description: item.game.Description || "",
      developer: item.game.developer || "Неизвестная студия",
      genre: item.game.Genre || "Экшен",
      image: item.game.Cover?.url ? `${STRAPI_URL}${item.game.Cover.url}` : item.image,
    });
  };

  const renderTrack = (items: BannerItem[], reverse: boolean) => {
    const loopList = [...items, ...items, ...items];
    return (
      <div className="us-marquee-viewport">
        <div className={`us-marquee-track ${reverse ? "is-reverse" : ""}`}>
          {loopList.map((item, idx) => (
            <button
              key={`${reverse ? "b" : "t"}-${idx}`}
              type="button"
              className="us-banner-card"
              onClick={() => handleBannerClick(item)}
            >
              <img src={item.image} alt={item.game?.Title || "Игра"} loading="lazy" />
              {item.game?.Title && (
                <div className="us-banner-overlay">
                  <span className="us-banner-game-title">{item.game.Title}</span>
                  <span className="us-banner-game-price">{item.game.Price} ₽</span>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <>
      {selectedGame && (
        <QuickViewModal
          gameId={selectedGame.id}
          product={selectedGame}
          onClose={() => setSelectedGame(null)}
        />
      )}

      <div className="us-banner-wrap">
        {topItems.length > 0 && renderTrack(topItems, false)}
        {bottomItems.length > 0 && renderTrack(bottomItems, true)}
      </div>
    </>
  );
}
