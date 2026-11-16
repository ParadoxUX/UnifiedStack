'use client';

import { useState, useEffect, useCallback } from 'react';
import { getJSON, setJSON } from '@/lib/storage';
import { getWishlist } from '@/lib/wishlist';
import { products } from '@/data/products';
import { getCards, getBadges, getCraftableGames, craftBadge, SteamCard } from '@/lib/steamCards';
import { fetchLibrary } from '@/lib/wallet';
import { fetchGames } from '@/lib/strapi';
import LibraryCard from '@/components/library/LibraryCard';
import SteamCardComp from '@/components/library/SteamCard';
import GameCard from '@/components/store/GameCard';
import EmptyState from '@/components/ui/EmptyState';
import { showToast } from '@/lib/toast';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

export default function LibraryPage() {
  const [activeTab, setActiveTab] = useState<'games' | 'wishlist' | 'cards'>('games');
  const [games, setGames] = useState<any[]>([]);
  const [wishlistGames, setWishlistGames] = useState<any[]>([]);
  const [cards, setCards] = useState<SteamCard[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [mounted, setMounted] = useState(false);

  const loadData = useCallback(async () => {
    const localGames = getJSON<any[]>('user_game_library', []);
    let strapiItems: any[] = [];
    let allCatalogGames: any[] = [];

    try {
      allCatalogGames = await fetchGames();
    } catch {}

    try {
      strapiItems = await fetchLibrary();
    } catch {}

    const mergedMap = new Map<string, any>();

    // 1. Сначала берём купленные игры из Strapi
    for (const item of strapiItems) {
      if (item.status === 'refunded' || !item.game) continue;
      const docId = String(item.game.documentId || item.game.id);
      const fullGame = allCatalogGames.find(
        (cg) => String(cg.documentId) === docId || String(cg.id) === String(item.game.id)
      );
      const coverUrl = fullGame?.Cover?.url
        ? `${STRAPI_URL}${fullGame.Cover.url}`
        : '/img/game-placeholder.svg';

      mergedMap.set(docId, {
        id: docId,
        title: item.game.Title || fullGame?.Title || 'Игра',
        image: coverUrl,
        purchaseDate: item.purchasedAt
          ? new Date(item.purchasedAt).toLocaleDateString('ru-RU')
          : 'В коллекции',
      });
    }

    // 2. Добавляем игры из локального хранилища, если их нет в списке
    for (const lg of localGames) {
      if (!lg || !lg.id) continue;
      const key = String(lg.id);
      if (!mergedMap.has(key)) {
        const fullGame = allCatalogGames.find(
          (cg) => String(cg.documentId) === key || cg.Title === lg.title
        );
        const coverUrl = fullGame?.Cover?.url
          ? `${STRAPI_URL}${fullGame.Cover.url}`
          : lg.image || products[key]?.image || '/img/game-placeholder.svg';

        mergedMap.set(key, {
          ...lg,
          id: key,
          image: coverUrl,
        });
      }
    }

    const finalGames = Array.from(mergedMap.values());
    setGames(finalGames);
    setJSON('user_game_library', finalGames);

    // Желаемое сопоставляем с реальными играми из Strapi
    const wishIds = getWishlist();
    const matchedWish = allCatalogGames.filter((cg) => wishIds.includes(String(cg.documentId)));
    setWishlistGames(matchedWish);

    setCards(getCards());
    setBadges(getBadges());
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
    window.addEventListener('us:library-updated', loadData);
    return () => window.removeEventListener('us:library-updated', loadData);
  }, [loadData]);

  const handleRemoveGame = (id: string) => {
    const updated = games.filter((g) => String(g.id) !== String(id));
    setGames(updated);
    setJSON('user_game_library', updated);
    showToast('Игра скрыта из локальной библиотеки', 'info');
  };

  const handleCraft = (gameId: string) => {
    if (confirm('Скрафтить значок? 5 уникальных карточек этой игры будут потрачены.')) {
      if (craftBadge(gameId)) {
        showToast('Значок создан!', 'success');
        loadData();
      } else {
        showToast('Ошибка при крафте', 'error');
      }
    }
  };

  if (!mounted) return null;

  const craftable = getCraftableGames();

  const cardsByGame = cards.reduce((acc: Record<string, SteamCard[]>, c) => {
    if (!acc[c.gameId]) acc[c.gameId] = [];
    acc[c.gameId].push(c);
    return acc;
  }, {});

  return (
    <div className="library-page" style={{ display: 'block', padding: '20px' }}>
      <div className="library-tabs" style={{ display: 'flex', gap: '10px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          type="button"
          onClick={() => { setActiveTab('games'); loadData(); }}
          className={`us-tab-pill ${activeTab === 'games' ? 'active' : ''}`}
        >
          Библиотека ({games.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('wishlist'); loadData(); }}
          className={`us-tab-pill ${activeTab === 'wishlist' ? 'active' : ''}`}
        >
          Желаемое ({wishlistGames.length})
        </button>
        <button
          type="button"
          onClick={() => { setActiveTab('cards'); loadData(); }}
          className={`us-tab-pill ${activeTab === 'cards' ? 'active' : ''}`}
        >
          Карточки ({cards.length})
        </button>
      </div>

      {activeTab === 'games' && (
        <div>
          <h2 className="library-title">Моя библиотека</h2>
          {games.length === 0 ? (
            <EmptyState
              title="Библиотека пуста"
              desc="Купленные в каталоге игры появятся здесь автоматически."
              linkText="Перейти в магазин"
              linkHref="/store"
            />
          ) : (
            <div className="library-grid">
              {games.map((g, i) => (
                <LibraryCard key={`${g.id}_${i}`} game={g} onRemove={handleRemoveGame} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'wishlist' && (
        <div>
          <h2 className="library-title">Список желаемого</h2>
          {wishlistGames.length === 0 ? (
            <EmptyState
              title="В списке желаемого пока пусто"
              desc="Нажимайте на сердечко на карточках игр, чтобы сохранять их сюда."
              linkText="Перейти в магазин"
              linkHref="/store"
            />
          ) : (
            <div className="games-grid">
              {wishlistGames.map((game) => (
                <GameCard key={game.documentId} game={game} onWishlistToggle={loadData} />
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'cards' && (
        <div>
          <h2 className="library-title">Коллекционные карточки</h2>

          {craftable.length > 0 && (
            <div className="us-craft-banner">
              <h3>Доступно для крафта</h3>
              {craftable.map((g) => (
                <div key={g.gameId} className="us-craft-row">
                  <span>{g.gameTitle}</span>
                  <button type="button" onClick={() => handleCraft(g.gameId)} className="btn-auth-launch">
                    Скрафтить значок
                  </button>
                </div>
              ))}
            </div>
          )}

          {badges.length > 0 && (
            <div style={{ marginBottom: '30px' }}>
              <h3 style={{ color: '#c4b5fd', margin: '0 0 15px 0', fontSize: '18px' }}>Ваши значки</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '15px' }}>
                {badges.map((b, i) => (
                  <div key={`${b.id}_${i}`} className="us-badge-card">
                    <div style={{ color: '#f8fafc', fontSize: '13px', fontWeight: 'bold' }}>{b.gameTitle}</div>
                    <div style={{ color: '#94a3b8', fontSize: '11px', marginTop: '5px' }}>{b.craftedDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {cards.length === 0 ? (
            <EmptyState
              title="Карточек пока нет"
              desc="При покупке каждой игры вы получаете набор из 3 коллекционных карточек."
              linkText="Перейти в магазин"
              linkHref="/store"
            />
          ) : (
            <div>
              {Object.entries(cardsByGame).map(([gameId, gameCards]) => {
                const uniqueIndices = new Set(gameCards.map((c) => c.index));
                return (
                  <div key={gameId} style={{ marginBottom: '25px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                      <h4 style={{ margin: 0, color: '#fff', fontSize: '16px' }}>{gameCards[0].gameTitle}</h4>
                      <span style={{ color: uniqueIndices.size >= 5 ? '#4ade80' : '#c4b5fd', fontWeight: 'bold', fontSize: '14px' }}>
                        {uniqueIndices.size} / 5
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      {gameCards.map((c, i) => (
                        <SteamCardComp key={`${c.id}_${i}`} gameTitle={c.gameTitle} index={c.index} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
