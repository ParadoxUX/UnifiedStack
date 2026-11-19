"use client";

import { useState, useEffect } from "react";
import { toggleWishlist, isInWishlist } from "@/lib/wishlist";
import { getJSON } from "@/lib/storage";
import Icon from "@/components/ui/Icon";
import QuickViewModal from "./QuickViewModal";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

function computeRating(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 1000;
  const score = 8.4 + (h % 15) * 0.1;
  return score.toFixed(1);
}

export default function GameCard({
  game,
  onWishlistToggle,
}: {
  game: any;
  onWishlistToggle?: () => void;
}) {
  const [inWishlist, setInWishlist] = useState(false);
  const [purchased, setPurchased] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);

  const gameId = game?.documentId ?? "";
  const rawUrl = game?.Cover?.url || "";
  const initialImage = rawUrl
    ? rawUrl.startsWith("http")
      ? rawUrl
      : `${STRAPI_URL}${rawUrl}`
    : game?.image || "/img/game-placeholder.svg";

  const [imgSrc, setImgSrc] = useState(initialImage);

  useEffect(() => {
    setImgSrc(initialImage);
  }, [initialImage]);

  const oldPrice = game?.oldPrice || null;
  const currentPrice = game?.Price ?? game?.price ?? 0;

  const discount =
    oldPrice && oldPrice > currentPrice
      ? Math.round((1 - currentPrice / oldPrice) * 100)
      : null;

  const rating = computeRating(String(game?.slug || game?.Title || gameId));

  const normalizedProduct = {
    id: gameId,
    title: game?.Title || game?.title || "Без названия",
    price: currentPrice === 0 ? "Бесплатно" : `${currentPrice} ₽`,
    priceNum: currentPrice,
    oldPrice,
    isSale: Boolean(game?.isSale),
    description: game?.Description || game?.description || "",
    developer: game?.developer || "Неизвестная студия",
    genre: game?.Genre || game?.genre || "Экшен",
    image: imgSrc,
  };

  useEffect(() => {
    if (!gameId) return;
    setInWishlist(isInWishlist(gameId));
    const library = getJSON<any[]>("user_game_library", []);
    setPurchased(library.some((g) => g.id === gameId || g.id === game?.id));
  }, [gameId, game?.id]);

  if (!game || !game.documentId) return null;

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    const added = toggleWishlist(gameId);
    setInWishlist(added);
    if (onWishlistToggle) onWishlistToggle();
  };

  return (
    <>
      {showQuickView && (
        <QuickViewModal
          gameId={gameId}
          product={normalizedProduct}
          onClose={() => setShowQuickView(false)}
        />
      )}

      <article
        className={`game-card us-game-card ${purchased ? "is-purchased" : ""}`}
        onClick={() => setShowQuickView(true)}
      >
        {discount && !purchased && (
          <span className="us-badge us-badge-discount">-{discount}%</span>
        )}

        {purchased && (
          <span className="us-badge us-badge-owned">В библиотеке</span>
        )}

        <button
          type="button"
          className={`wish-btn us-wish-btn ${inWishlist ? "active" : ""}`}
          onClick={handleWishlist}
          aria-label="В желаемое"
        >
          <Icon name="heart" size={16} />
        </button>

        <div className="us-card-media">
          <img
            src={imgSrc}
            alt={normalizedProduct.title}
            loading="lazy"
            onError={() => setImgSrc("/img/game-placeholder.svg")}
          />
        </div>

        <div className="us-card-body">
          <div className="pv-card-meta-row">
            <span className="us-card-genre">{normalizedProduct.genre}</span>
            <span className="pv-card-rating">★ {rating}</span>
          </div>

          <h4>{normalizedProduct.title}</h4>

          <div className="pv-card-footer">
            <div className="us-card-price-row">
              {discount && !purchased ? (
                <>
                  <span className="us-price-old">{oldPrice} ₽</span>
                  <span className="us-price-new">{currentPrice} ₽</span>
                </>
              ) : (
                <span className={`price ${currentPrice === 0 ? "is-free" : ""}`}>
                  {currentPrice === 0 ? "Бесплатно" : `${currentPrice} ₽`}
                </span>
              )}
            </div>

            <button
              type="button"
              className={`sellgame2 us-buy-btn ${purchased ? "owned" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                setShowQuickView(true);
              }}
            >
              {purchased ? "Открыть" : currentPrice === 0 ? "Забрать" : "Купить"}
            </button>
          </div>
        </div>
      </article>
    </>
  );
}
