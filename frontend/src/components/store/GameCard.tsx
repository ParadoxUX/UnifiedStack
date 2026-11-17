"use client";

import { useState, useEffect } from "react";
import { toggleWishlist, isInWishlist } from "@/lib/wishlist";
import { getJSON } from "@/lib/storage";
import { imageUrl } from "@/lib/media";
import Icon from "@/components/ui/Icon";
import QuickViewModal from "./QuickViewModal";

const PLACEHOLDER = "/img/game-placeholder.svg";

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
  const initialImage = imageUrl(game?.Cover) || PLACEHOLDER;

  const [imgSrc, setImgSrc] = useState(initialImage);

  useEffect(() => {
    setImgSrc(initialImage);
  }, [initialImage]);

  const oldPrice = game?.oldPrice || null;
  const currentPrice = game?.Price ?? 0;

  const discount =
    oldPrice && oldPrice > currentPrice
      ? Math.round((1 - currentPrice / oldPrice) * 100)
      : null;

  const normalizedProduct = {
    id: gameId,
    title: game?.Title || "Без названия",
    price: `${currentPrice} ₽`,
    priceNum: currentPrice,
    description: game?.Description || "",
    developer: game?.developer || "Неизвестная студия",
    genre: game?.Genre || "Экшен",
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

  const handleClick = () => {
    if (!purchased) setShowQuickView(true);
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
        onClick={handleClick}
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
          <Icon name="heart" size={17} />
        </button>

        <div className="us-card-media">
          <img
            src={imgSrc}
            alt={game.Title}
            onError={() => setImgSrc("/img/game-placeholder.svg")}
          />
        </div>

        <div className="us-card-body">
          <span className="us-card-genre">{normalizedProduct.genre}</span>
          <h4>{game.Title}</h4>

          <div className="us-card-price-row">
            {discount && !purchased ? (
              <>
                <span className="us-price-old">{oldPrice} ₽</span>
                <span className="us-price-new">{currentPrice} ₽</span>
              </>
            ) : (
              <span className="price">{currentPrice === 0 ? "Бесплатно" : `${currentPrice} ₽`}</span>
            )}
          </div>

          <button
            type="button"
            className={`sellgame2 us-buy-btn ${purchased ? "owned" : ""}`}
            disabled={purchased}
            onClick={(e) => {
              e.stopPropagation();
              if (!purchased) setShowQuickView(true);
            }}
          >
            {purchased ? "Куплено" : "Купить"}
          </button>
        </div>
      </article>
    </>
  );
}
