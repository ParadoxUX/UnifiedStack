"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import GameCard from "./GameCard";
import QuickViewModal from "./QuickViewModal";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

const HERO_SLUGS = [
  "cyberpunk-2077",
  "elden-ring",
  "red-dead-redemption-2",
  "the-witcher-3",
  "gta-v",
  "silent-hill-2",
  "god-of-war",
  "sekiro",
];

const FEATURED_SLUGS = [
  "elden-ring",
  "cyberpunk-2077",
  "gta-v",
  "red-dead-redemption-2",
  "the-witcher-3",
  "silent-hill-2",
];

const HOT_SLUGS = [
  "elden-ring",
  "cyberpunk-2077",
  "gta-v",
  "hogwarts-legacy",
  "resident-evil-4",
  "sekiro",
];

const TRENDING_TAGS = [
  { label: "#Elden Ring", q: "Elden Ring" },
  { label: "#Cyberpunk 2077", q: "Cyberpunk" },
  { label: "#GTA V", q: "GTA" },
  { label: "#The Witcher 3", q: "Witcher" },
  { label: "#VALORANT", q: "VALORANT" },
  { label: "#Free-to-Play", q: "Free-to-play" },
];

const CATEGORIES = [
  { id: "all", label: "Все игры", match: "", icon: "✦" },
  { id: "action", label: "Action", match: "action", icon: "⚔" },
  { id: "rpg", label: "RPG", match: "rpg", icon: "♛" },
  { id: "horror", label: "Horror", match: "horror", icon: "☠" },
  { id: "shooter", label: "Shooter", match: "shooter", icon: "◎" },
  { id: "survival", label: "Выживание", match: "выжив", icon: "▲" },
  { id: "strategy", label: "Strategy", match: "strat", icon: "❖" },
  { id: "free", label: "Бесплатно", match: "__free__", icon: "★" },
];

function getCoverUrl(g: any): string {
  const url = g?.Cover?.url;
  if (!url) return "/img/game-placeholder.svg";
  return url.startsWith("http") ? url : `${STRAPI_URL}${url}`;
}

function getRating(slug: string): string {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) % 1000;
  return (8.7 + (h % 12) * 0.1).toFixed(1);
}

export default function HomeShowcase({ games }: { games: any[] }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [sortBy, setSortBy] = useState<"popular" | "sale" | "free" | "cheap">("popular");
  const [heroIdx, setHeroIdx] = useState(0);
  const [quickGame, setQuickGame] = useState<any>(null);

  const heroPool = useMemo(() => {
    const picked = HERO_SLUGS.map((s) => games.find((g) => g.slug === s)).filter(Boolean);
    return picked.length >= 4 ? picked : games.slice(0, 8);
  }, [games]);

  useEffect(() => {
    if (heroPool.length < 2) return;
    const id = setInterval(() => {
      setHeroIdx((i) => (i + 1) % heroPool.length);
    }, 7000);
    return () => clearInterval(id);
  }, [heroPool.length]);

  const activeHero = heroPool[heroIdx] || games[0] || null;
  const heroOld = Number(activeHero?.oldPrice ?? 0);
  const heroPrice = Number(activeHero?.Price ?? 0);
  const heroDiscount = heroOld > heroPrice ? Math.round((1 - heroPrice / heroOld) * 100) : 0;

  const saleCount = useMemo(
    () => games.filter((g) => g.oldPrice && g.oldPrice > (g.Price ?? 0)).length,
    [games]
  );
  const freeCount = useMemo(
    () => games.filter((g) => Number(g.Price ?? 0) === 0).length,
    [games]
  );

  const featuredGames = useMemo(() => {
    const picked = FEATURED_SLUGS.map((s) => games.find((g) => g.slug === s)).filter(Boolean);
    return picked.length >= 6 ? picked : games.slice(0, 6);
  }, [games]);

  const hotGames = useMemo(() => {
    const picked = HOT_SLUGS.map((s) => games.find((g) => g.slug === s)).filter(Boolean);
    return picked.length >= 5 ? picked : games.slice(0, 6);
  }, [games]);

  const filteredCatalog = useMemo(() => {
    let list = [...games];
    if (activeCategory !== "all") {
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      if (cat?.match === "__free__") {
        list = list.filter((g) => Number(g.Price ?? 0) === 0);
      } else if (cat?.match) {
        list = list.filter((g) => String(g.Genre || "").toLowerCase().includes(cat.match));
      }
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (g) =>
          String(g.Title || "").toLowerCase().includes(q) ||
          String(g.Genre || "").toLowerCase().includes(q) ||
          String(g.developer || "").toLowerCase().includes(q)
      );
    }
    if (sortBy === "sale") list = list.filter((g) => g.oldPrice && g.oldPrice > (g.Price ?? 0));
    else if (sortBy === "free") list = list.filter((g) => Number(g.Price ?? 0) === 0);
    else if (sortBy === "cheap") list.sort((a, b) => Number(a.Price ?? 0) - Number(b.Price ?? 0));
    return list;
  }, [games, activeCategory, search, sortBy]);

  const collections = useMemo(() => {
    const pickImg = (slug: string, idx: number) => {
      const g = games.find((x) => x.slug === slug) || games[idx];
      return g ? getCoverUrl(g) : "/img/game-placeholder.svg";
    };
    return [
      { title: "Лучшие открытые миры", count: `${games.filter((g) => /rpg|open|открыт/i.test(String(g.Genre || ""))).length} игр`, img: pickImg("red-dead-redemption-2", 0), apply: () => { setActiveCategory("rpg"); setSearch(""); } },
      { title: "Культовые хорроры", count: `${games.filter((g) => /horror|хоррор/i.test(String(g.Genre || ""))).length} игр`, img: pickImg("silent-hill-2", 1), apply: () => { setActiveCategory("horror"); setSearch(""); } },
      { title: "Бесплатные хиты", count: `${freeCount} игр`, img: pickImg("counter-strike-2", 2), apply: () => { setActiveCategory("free"); setSearch(""); } },
      { title: "Экшен и приключения", count: `${games.filter((g) => /action/i.test(String(g.Genre || ""))).length} игр`, img: pickImg("god-of-war", 3), apply: () => { setActiveCategory("action"); setSearch(""); } },
      { title: "Максимальные скидки", count: `${saleCount} игр`, img: pickImg("the-witcher-3", 4), apply: () => { setActiveCategory("all"); setSortBy("sale"); setSearch(""); } },
    ];
  }, [games, freeCount, saleCount]);

  const openQuick = (g: any) => {
    if (!g) return;
    const priceNum = Number(g.Price ?? 0);
    setQuickGame({
      id: g.documentId ?? g.id,
      title: g.Title || "Без названия",
      price: priceNum === 0 ? "Бесплатно" : `${priceNum} ₽`,
      priceNum,
      oldPrice: g.oldPrice ?? null,
      isSale: Boolean(g.isSale),
      description: g.Description || "",
      developer: g.developer || "Неизвестная студия",
      genre: g.Genre || "Экшен",
      image: getCoverUrl(g),
    });
  };

  const scrollToCatalog = () => {
    document.getElementById("pv-catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="pv-home">
      {quickGame && (
        <QuickViewModal gameId={quickGame.id} product={quickGame} onClose={() => setQuickGame(null)} />
      )}

      {/* ИНТЕРАКТИВНЫЙ HERO-ПЕРЕКЛЮЧАТЕЛЬ (стиль 1-го референса + живой поиск) */}
      <section className="pv-hero pv-hero-cine">
        {activeHero && (
          <div
            key={activeHero.documentId}
            className="pv-hero-bg pv-hero-fade"
            style={{ backgroundImage: `url("${getCoverUrl(activeHero)}")` }}
          />
        )}

        {/* Верхняя лента обложек-переключателей */}
        {heroPool.length > 0 && (
          <div className="pv-hero-strip-wrap">
            <div className="pv-hero-strip">
              {heroPool.map((g, i) => (
                <button
                  key={g.documentId}
                  type="button"
                  className={`pv-hero-thumb ${i === heroIdx ? "is-active" : ""}`}
                  onClick={() => setHeroIdx(i)}
                  title={g.Title}
                >
                  <img src={getCoverUrl(g)} alt={g.Title} />
                </button>
              ))}
            </div>
            <div className="pv-hero-arrows">
              <button type="button" onClick={() => setHeroIdx((i) => (i - 1 + heroPool.length) % heroPool.length)} aria-label="Предыдущая">‹</button>
              <button type="button" onClick={() => setHeroIdx((i) => (i + 1) % heroPool.length)} aria-label="Следующая">›</button>
            </div>
          </div>
        )}

        <div className="pv-hero-grid-inner">
          <div className="pv-hero-left">
            <div className="pv-hero-badges">
              {heroDiscount > 0 && <span className="pv-pill-sale">Скидка -{heroDiscount}%</span>}
              <span className="pv-pill-release">{activeHero?.Genre || "Хит каталога"} • {activeHero?.game_year || "2025"}</span>
            </div>

            <h1 className="pv-hero-title">
              {activeHero ? activeHero.Title : "UNIFIEDSTACK"}
            </h1>

            <p className="pv-hero-sub">
              {activeHero?.Description
                ? `${String(activeHero.Description).slice(0, 175)}${String(activeHero.Description).length > 175 ? "..." : ""}`
                : "Актуальный каталог с ценами как в Steam, дополнения и облачный ПК-клуб."}
            </p>

            {activeHero && (
              <div className="pv-hero-price-line">
                {heroDiscount > 0 && <span className="pv-hero-old">{heroOld} ₽</span>}
                <strong className="pv-hero-price">{heroPrice === 0 ? "Бесплатно" : `${heroPrice} ₽`}</strong>
              </div>
            )}

            <div className="pv-hero-actions">
              {activeHero && (
                <button type="button" className="pv-btn-primary" onClick={() => openQuick(activeHero)}>
                  {heroPrice === 0 ? "Забрать бесплатно" : "Купить сейчас"}
                </button>
              )}
              {activeHero && (
                <Link href={`/store/${activeHero.documentId}`} className="pv-btn-glass">
                  Подробнее об игре
                </Link>
              )}
              <Link href="/cloud" className="pv-btn-glass">
                ПК-клуб
              </Link>
            </div>
          </div>

          <div className="pv-hero-right-panel">
            <div className="pv-hero-search">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") scrollToCatalog(); }}
                placeholder="Поиск по 59 играм, жанрам, студиям..."
                aria-label="Поиск по каталогу"
              />
              <span className="pv-hero-search-icon" aria-hidden="true">⌕</span>
            </div>

            <div className="pv-hero-tags">
              {TRENDING_TAGS.map((tag) => (
                <button
                  key={tag.label}
                  type="button"
                  className={`pv-tag-chip ${search.toLowerCase() === tag.q.toLowerCase() ? "is-active" : ""}`}
                  onClick={() => { setSearch((prev) => (prev === tag.q ? "" : tag.q)); scrollToCatalog(); }}
                >
                  {tag.label}
                </button>
              ))}
            </div>

            <div className="pv-mini-stats">
              <div><strong>{games.length}+</strong><span>игр Steam</span></div>
              <div><strong>{saleCount}</strong><span>со скидкой</span></div>
              <div><strong>{freeCount}</strong><span>бесплатно</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED + HOT THIS WEEK */}
      <section>
        <div className="pv-sec-head">
          <h2 className="pv-sec-title">Главные хиты</h2>
          <Link href="/store" className="pv-sec-link">Смотреть все →</Link>
        </div>

        <div className="pv-featured-layout">
          <div className="pv-featured-grid">
            {featuredGames.map((game) => (
              <GameCard key={game.documentId} game={game} />
            ))}
          </div>

          <aside className="pv-hot-panel">
            <div className="pv-hot-header">
              <h3 className="pv-hot-title">Хит недели</h3>
            </div>
            <div className="pv-hot-list">
              {hotGames.map((g, idx) => (
                <button key={g.documentId} type="button" className="pv-hot-row" onClick={() => openQuick(g)}>
                  <span className="pv-hot-rank">{idx + 1}</span>
                  <img src={getCoverUrl(g)} alt={g.Title} className="pv-hot-thumb" loading="lazy" />
                  <div style={{ minWidth: 0 }}>
                    <div className="pv-hot-name">{g.Title}</div>
                    <div className="pv-hot-genre">{g.Genre}</div>
                  </div>
                  <div className="pv-hot-meta">
                    <div className="pv-hot-rating">★ {getRating(g.slug || String(g.id))}</div>
                    <div className="pv-hot-price">{Number(g.Price ?? 0) === 0 ? "Free" : `${g.Price} ₽`}</div>
                  </div>
                </button>
              ))}
            </div>
            <Link href="/sale" className="pv-hot-all">Все горячие предложения</Link>
          </aside>
        </div>
      </section>

      {/* CATEGORIES */}
      <section>
        <div className="pv-sec-head">
          <h2 className="pv-sec-title">Популярные категории</h2>
        </div>
        <div className="pv-cat-grid">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              className={`pv-cat-card ${activeCategory === cat.id ? "is-active" : ""}`}
              onClick={() => { setActiveCategory(cat.id); scrollToCatalog(); }}
            >
              <span className="pv-cat-icon" aria-hidden="true">{cat.icon}</span>
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* COLLECTIONS */}
      <section>
        <div className="pv-sec-head">
          <h2 className="pv-sec-title">Подборки</h2>
          <Link href="/store" className="pv-sec-link">Открыть витрину →</Link>
        </div>
        <div className="pv-collections">
          {collections.map((col) => (
            <button key={col.title} type="button" className="pv-col-card" onClick={() => { col.apply(); scrollToCatalog(); }}>
              <img src={col.img} alt={col.title} loading="lazy" />
              <div className="pv-col-title">{col.title}</div>
              <div className="pv-col-count">{col.count}</div>
            </button>
          ))}
        </div>
      </section>

      {/* FULL CATALOG */}
      <section id="pv-catalog">
        <div className="pv-sec-head pv-filter-bar">
          <h2 className="pv-sec-title">
            Каталог игр
            <span style={{ fontSize: "13px", color: "#9892b3", fontWeight: 500 }}>({filteredCatalog.length})</span>
          </h2>
          <div className="pv-sort-group">
            {(
              [["popular", "Популярные"], ["sale", "Со скидкой"], ["free", "Бесплатные"], ["cheap", "Сначала дешевле"]] as const
            ).map(([key, label]) => (
              <button key={key} type="button" className={`pv-sort-btn ${sortBy === key ? "is-active" : ""}`} onClick={() => setSortBy(key)}>
                {label}
              </button>
            ))}
            {(search || activeCategory !== "all" || sortBy !== "popular") && (
              <button type="button" className="pv-sort-btn" onClick={() => { setSearch(""); setActiveCategory("all"); setSortBy("popular"); }}>
                Сбросить
              </button>
            )}
          </div>
        </div>

        {filteredCatalog.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 20px", color: "#9892b3" }}>По вашему фильтру игр не найдено.</div>
        ) : (
          <div className="games-grid">
            {filteredCatalog.map((game) => <GameCard key={game.documentId} game={game} />)}
          </div>
        )}
      </section>
    </div>
  );
}
