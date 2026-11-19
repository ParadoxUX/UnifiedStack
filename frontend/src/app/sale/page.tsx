"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchGames } from "@/lib/strapi";
import QuickViewModal from "@/components/store/QuickViewModal";
import Icon from "@/components/ui/Icon";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

type Tier = "all" | "small" | "medium" | "big";
type SortMode = "discount" | "price-asc" | "price-desc" | "title";

const TIERS: { id: Tier; label: string }[] = [
  { id: "all", label: "Все скидки" },
  { id: "big", label: "От −50%" },
  { id: "medium", label: "−20…50%" },
  { id: "small", label: "До −20%" },
];

const SORTS: { id: SortMode; label: string }[] = [
  { id: "discount", label: "По размеру скидки" },
  { id: "price-asc", label: "Сначала дешёвые" },
  { id: "price-desc", label: "Сначала дорогие" },
  { id: "title", label: "По названию" },
];

function discountOf(game: any): number {
  const price = Number(game?.Price ?? 0);
  const old = Number(game?.oldPrice ?? 0);
  if (!price || !old || old <= price) return 0;
  return Math.round((1 - price / old) * 100);
}

function coverOf(game: any): string {
  return game?.Cover?.url ? `${STRAPI_URL}${game.Cover.url}` : "/img/game-placeholder.svg";
}

function useCountdown() {
  const [left, setLeft] = useState({ h: 0, m: 0, s: 0 });
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      const end = new Date(now);
      end.setHours(23, 59, 59, 999);
      const diff = Math.max(0, end.getTime() - now.getTime());
      setLeft({
        h: Math.floor(diff / 3_600_000),
        m: Math.floor((diff % 3_600_000) / 60_000),
        s: Math.floor((diff % 60_000) / 1000),
      });
    };
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, []);
  return left;
}

export default function SalePage() {
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("all");
  const [sort, setSort] = useState<SortMode>("discount");
  const [query, setQuery] = useState("");
  const [openGame, setOpenGame] = useState<any | null>(null);
  const time = useCountdown();

  useEffect(() => {
    fetchGames()
      .then((data) => {
        const discounted = data.filter((g: any) => discountOf(g) > 0 || g.isSale === true);
        setGames(discounted);
      })
      .catch(() => setError("Не удалось загрузить скидки. Попробуйте позже."))
      .finally(() => setLoading(false));
  }, []);

  const featured = useMemo(
    () => [...games].sort((a, b) => discountOf(b) - discountOf(a))[0] ?? null,
    [games]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = games.filter((g) => {
      const d = discountOf(g);
      const matchesTier =
        tier === "all" ||
        (tier === "big" && d >= 50) ||
        (tier === "medium" && d >= 20 && d < 50) ||
        (tier === "small" && d < 20);
      const matchesQuery = !q || String(g.Title || "").toLowerCase().includes(q);
      return matchesTier && matchesQuery;
    });

    return list.sort((a, b) => {
      if (sort === "price-asc") return Number(a.Price) - Number(b.Price);
      if (sort === "price-desc") return Number(b.Price) - Number(a.Price);
      if (sort === "title") return String(a.Title).localeCompare(String(b.Title));
      return discountOf(b) - discountOf(a);
    });
  }, [games, tier, query, sort]);

  if (loading) {
    return (
      <div className="ur-page">
        <div className="ur-empty">Загружаем скидки…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ur-page">
        <div className="ur-empty">{error}</div>
      </div>
    );
  }

  return (
    <div className="ur-page">
      <div className="ur-page-head">
        <div>
          <p className="ur-kicker">Специальные предложения</p>
          <h1 className="ur-title">Скидки</h1>
          <p className="ur-subtitle">
            {games.length} игр со скидкой · предложения действуют до конца дня
          </p>
        </div>
        <div className="ur-sale-timer" aria-label="Время до конца скидок">
          {[
            { v: time.h, l: "часов" },
            { v: time.m, l: "минут" },
            { v: time.s, l: "секунд" },
          ].map((x) => (
            <div className="ur-sale-timebox" key={x.l}>
              <b>{String(x.v).padStart(2, "0")}</b>
              <span>{x.l}</span>
            </div>
          ))}
        </div>
      </div>

      {featured && (
        <section className="ur-sale-hero">
          <div>
            <p className="ur-kicker">Сделка дня</p>
            <h2>{featured.Title}</h2>
            <p>
              Скидка {discountOf(featured)}% — успейте забрать игру по лучшей цене.
              Предложение обновляется каждый день.
            </p>
            <button className="ur-btn ur-btn--primary" onClick={() => setOpenGame(featured)}>
              <Icon name="fire" size={16} /> Смотреть предложение
            </button>
          </div>
          <div className="ur-sale-feature">
            <img src={coverOf(featured)} alt={featured.Title} />
            <span className="ur-sale-feature-tag">−{discountOf(featured)}%</span>
            <span className="ur-sale-feature-name">{featured.Title}</span>
          </div>
        </section>
      )}

      <div className="ur-chip-row">
        {TIERS.map((t) => (
          <button
            key={t.id}
            className={`ur-chip ${tier === t.id ? "is-active" : ""}`}
            onClick={() => setTier(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="ur-friends-toolbar" style={{ marginBottom: 18 }}>
        <input
          className="ur-friends-search"
          placeholder="Найти игру среди скидок…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <div className="ur-chip-row" style={{ margin: "12px 0 0" }}>
          {SORTS.map((s) => (
            <button
              key={s.id}
              className={`ur-chip ${sort === s.id ? "is-active" : ""}`}
              onClick={() => setSort(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="ur-empty">По этим фильтрам игр нет — попробуйте другие условия.</div>
      ) : (
        <div className="ur-deal-grid">
          {visible.map((game, i) => {
            const d = discountOf(game);
            return (
              <article
                className="ur-deal"
                key={game.documentId || game.id}
                style={{ animationDelay: `${Math.min(i * 35, 350)}ms` }}
                onClick={() => setOpenGame(game)}
              >
                <div className="ur-deal-cover">
                  <img src={coverOf(game)} alt={game.Title} loading="lazy" />
                  <span className="ur-deal-discount">−{d}%</span>
                </div>
                <div className="ur-deal-body">
                  <h3 className="ur-deal-title">{game.Title}</h3>
                  <div className="ur-deal-prices">
                    <span className="ur-deal-old">{game.oldPrice} ₽</span>
                    <span className="ur-deal-price">{game.Price} ₽</span>
                  </div>
                  <div className="ur-deal-bar" title={`Скидка ${d}%`}>
                    <i style={{ width: `${d}%` }} />
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {openGame && (
        <QuickViewModal
          gameId={openGame.documentId}
          product={{
            id: openGame.documentId,
            title: openGame.Title,
            price: `${openGame.Price} ₽`,
            priceNum: Number(openGame.Price),
            description: openGame.Description || "",
            developer: openGame.developer || "Неизвестная студия",
            genre: openGame.Genre || "Игра",
            image: coverOf(openGame),
          }}
          onClose={() => setOpenGame(null)}
        />
      )}
    </div>
  );
}
