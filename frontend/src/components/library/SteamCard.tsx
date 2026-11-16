'use client';

import { CARD_TIERS } from '@/lib/steamCards';

interface SteamCardProps {
  cardId?: string;
  gameTitle?: string;
  index: number;
  image?: string;
  onSell?: (cardId: string) => void;
}

export default function SteamCard({ cardId, gameTitle, index, image, onSell }: SteamCardProps) {
  const safeTitle = gameTitle && gameTitle.length > 0 ? gameTitle : 'UnifiedStack';
  const tier = CARD_TIERS[(index || 0) % CARD_TIERS.length];

  return (
    <div
      className="us-collectible-card"
      style={{
        borderColor: tier.color,
        boxShadow: `0 10px 25px rgba(0,0,0,0.5), 0 0 18px ${tier.glow}`,
      }}
    >
      <div className="us-cc-top">
        <span className="us-cc-rarity" style={{ color: tier.color }}>
          {tier.rarity}
        </span>
        <span className="us-cc-num">#{(index || 0) + 1}/5</span>
      </div>

      <div className="us-cc-art">
        <img src={image || '/img/game-placeholder.svg'} alt={safeTitle} />
        <div className="us-cc-holo" />
      </div>

      <div className="us-cc-info">
        <div className="us-cc-role" style={{ color: tier.color }}>
          {tier.name}
        </div>
        <div className="us-cc-game" title={safeTitle}>
          {safeTitle}
        </div>
      </div>

      {cardId && onSell && (
        <button
          type="button"
          className="us-cc-sell-btn"
          onClick={() => onSell(cardId)}
          title="Распылить карточку в поинты"
        >
          Продать +40 P
        </button>
      )}
    </div>
  );
}
