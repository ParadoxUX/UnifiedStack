import { Metadata } from "next";
import { fetchDlcs, fetchFromStrapi } from "@/lib/strapi";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDescription from "@/components/store/ProductDescription";
import BuyButton from "@/components/store/BuyButton";
import ProductReviews from "@/components/store/ProductReviews";
import Icon from "@/components/ui/Icon";
import GameMediaGallery, { MediaSlide } from "@/components/store/GameMediaGallery";
import DlcBuyButton from "@/components/store/DlcBuyButton";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

// Strapi 5: media — либо объект, либо { data: {...} } либо массив таких значений
function mediaList(value: any): any[] {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : value.data ?? [value];
  return (Array.isArray(arr) ? arr : [arr]).filter(Boolean);
}

function mediaUrl(file: any): string | null {
  if (!file) return null;
  const url = file.url || file.attributes?.url;
  return url ? `${STRAPI_URL}${url}` : null;
}

// Ищем первое заполненное поле по списку возможных названий (media / string / JSON)
function pickField(game: any, keys: string[]) {
  for (const key of keys) {
    const value = game?.[key];
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    return value;
  }
  return null;
}

function buildSlides(game: any): MediaSlide[] {
  const slides: MediaSlide[] = [];

  // 1. Трейлеры: media-поле, строковый URL или список ссылок
  for (const file of mediaList(pickField(game, ["Trailer", "Video", "trailers", "Videos"]))) {
    const url = typeof file === "string" ? file : mediaUrl(file);
    if (!url) continue;
    const poster = mediaUrl(file?.Poster || file) ?? undefined;
    slides.push({ type: "video", src: url, thumb: poster, caption: game.Title });
  }

  for (const raw of [
    game.trailerUrl,
    game.videoUrl,
    game.youtubeUrl,
    ...(Array.isArray(game.TrailerUrls) ? game.TrailerUrls : []),
    ...(Array.isArray(game.Videos) && typeof game.Videos[0] === "string" ? game.Videos : []),
  ]) {
    const url = typeof raw === "string" ? raw.trim() : "";
    if (url && !slides.some((s) => s.src === url)) slides.push({ type: "video", src: url });
  }

  // 2. Скриншоты
  for (const file of mediaList(pickField(game, ["Screenshots", "screenshots", "Gallery", "Media"]))) {
    const url = typeof file === "string" ? file : mediaUrl(file);
    if (url) slides.push({ type: "image", src: url, thumb: url, caption: game.Title });
  }

  // 3. Статичные превью, если скриншотов нет — обложка, баннер и т.п.
  if (!slides.some((s) => s.type === "image")) {
    for (const key of ["Preview", "Banner", "Poster", "Image", "artwork"]) {
      const url = mediaUrl(game[key]);
      if (url) slides.push({ type: "image", src: url, thumb: url });
    }
  }

  return slides;
}

function normalize(raw: any) {
  if (!raw) return null;
  const g = Array.isArray(raw) ? raw[0] : raw;
  if (!g) return null;

  return {
    id: g.documentId ?? g.id,
    title: g.Title || "Без названия",
    price: `${g.Price ?? 0} ₽`,
    priceNum: g.Price ?? 0,
    description: g.Description || "Описание отсутствует",
    developer: g.developer || "Неизвестная студия",
    genre: g.Genre || "Экшен",
    platform: g.Platform || "PC (Windows)",
    releaseDate: g.game_year ?? "2025",
    image: g.Cover?.url
      ? `${STRAPI_URL}${g.Cover.url}`
      : "/img/game-placeholder.svg",
    isSale: Boolean(g.isSale),
    oldPrice: g.oldPrice,
    media: buildSlides(g),
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  let raw: any = null;
  try {
    raw = await fetchFromStrapi(`games/${id}`);
  } catch {}
  const product = normalize(raw);
  if (!product) return { title: "Игра не найдена | UnifiedStack" };

  return {
    title: `${product.title} — UnifiedStack`,
    description: product.description.substring(0, 160),
    openGraph: {
      title: product.title,
      description: product.description.substring(0, 160),
      images: [product.image],
    },
  };
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let raw: any = null;
  try {
    raw = await fetchFromStrapi(`games/${id}`);
  } catch {}

  const product = normalize(raw);
  if (!product) notFound();

  const allDlcs = await fetchDlcs();
  const dlcs = allDlcs.filter(
    (d: any) =>
      String(d.game?.documentId ?? d.game?.id) === String(product.id)
  );

  const discount =
    product.isSale && product.oldPrice && product.oldPrice > product.priceNum
      ? Math.round(((product.oldPrice - product.priceNum) / product.oldPrice) * 100)
      : 0;

  const genreTags = String(product.genre)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return (
    <div className="us-steam-page">
      {/* Атмосферный размытый фон из обложки игры как в Steam */}
      <div
        className="us-steam-backdrop"
        style={{ backgroundImage: `url("${product.image}")` }}
        aria-hidden="true"
      />

      <div className="us-steam-container">
        {/* Хлебные крошки */}
        <div className="us-steam-breadcrumbs">
          <Link href="/store" className="us-back-link" style={{ marginBottom: 0 }}>
            <span style={{ display: "inline-flex", transform: "rotate(90deg)" }}>
              <Icon name="chevron" size={15} />
            </span>
            <span>Все игры</span>
          </Link>
          <span className="us-crumb-sep">/</span>
          <span className="us-crumb-genre">{genreTags[0] || "Каталог"}</span>
          <span className="us-crumb-sep">/</span>
          <span className="us-crumb-current">{product.title}</span>
        </div>

        <h1 className="us-steam-title">{product.title}</h1>

        {/* Основная двухколоночная сетка в стиле Steam */}
        <div className="us-steam-layout">
          {/* Левая основная колонка */}
          <div className="us-steam-main">
            <GameMediaGallery
              slides={product.media}
              fallback={product.image}
              title={product.title}
            />

            {/* Плашка покупки в стиле Steam */}
            <div className="us-steam-buy-box">
              <div className="us-steam-buy-left">
                <div className="us-steam-buy-title">Купить {product.title}</div>
                <div className="us-steam-buy-sub">Включает базовую игру, облачные сохранения и набор из 3 карточек</div>
              </div>

              <div className="us-steam-buy-actions">
                {discount > 0 ? (
                  <div className="us-steam-price-pill">
                    <span className="us-steam-discount">-{discount}%</span>
                    <div className="us-steam-price-stack">
                      <span className="us-price-old">{product.oldPrice} ₽</span>
                      <span className="us-price-new">{product.price}</span>
                    </div>
                  </div>
                ) : (
                  <div className="us-steam-price-pill">
                    <span className="us-steam-price-val">
                      {product.priceNum === 0 ? "Бесплатно" : product.price}
                    </span>
                  </div>
                )}

                <BuyButton
                  gameId={product.id}
                  title={product.title}
                  price={product.price}
                  image={product.image}
                />
              </div>
            </div>

            {/* Дополнения (DLC) — отдельные товары с отдельной покупкой */}
            {dlcs.length > 0 && (
              <section className="ur-dlc-section">
                <div className="ur-dlc-head">
                  <div>
                    <p className="ur-kicker">Дополнения</p>
                    <h2>Расширьте свою игру</h2>
                    <p className="ur-subtitle">Покупается отдельно, добавляется в библиотеку сразу</p>
                  </div>
                  <span className="ur-dlc-count">{dlcs.length} DLC</span>
                </div>
                <div className="ur-dlc-grid">
                  {dlcs.map((d: any) => {
                    const dlcId = String(d.documentId ?? d.id);
                    const cover = d.Cover?.url
                      ? `${STRAPI_URL}${d.Cover.url}`
                      : product.image;
                    const price = Number(d.Price ?? 0);
                    const old = Number(d.oldPrice ?? 0);
                    const dlcDiscount = old > price ? Math.round((1 - price / old) * 100) : 0;
                    return (
                      <article className="ur-dlc-card" key={dlcId}>
                        <div className="ur-dlc-cover">
                          <img src={cover} alt={d.Title} loading="lazy" />
                          <span className="ur-dlc-badge">DLC</span>
                          {dlcDiscount > 0 && (
                            <span className="ur-dlc-discount">−{dlcDiscount}%</span>
                          )}
                        </div>
                        <div className="ur-dlc-body">
                          <h3>{d.Title}</h3>
                          <p>{d.Description}</p>
                          <div className="ur-dlc-price-row">
                            {dlcDiscount > 0 && <span className="ur-dlc-old">{old} ₽</span>}
                            <span className="ur-dlc-price">{price} ₽</span>
                          </div>
                          <DlcBuyButton dlcId={dlcId} title={d.Title} price={price} />
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {/* Об игре */}
            <section className="us-steam-section">
              <h2 className="us-steam-section-title">Об этой игре</h2>
              <ProductDescription text={product.description} />
            </section>

            {/* Системные требования */}
            <section className="us-steam-section">
              <h2 className="us-steam-section-title">Системные требования</h2>
              <div className="us-sysreq-grid">
                <div className="us-sysreq-col">
                  <h4>Минимальные</h4>
                  <ul>
                    <li><span>ОС:</span> Windows 10 64-bit</li>
                    <li><span>Процессор:</span> Intel Core i5-8400 / Ryzen 5 2600</li>
                    <li><span>Память:</span> 8 ГБ ОЗУ</li>
                    <li><span>Видеокарта:</span> NVIDIA GTX 1060 6 ГБ / RX 580</li>
                    <li><span>Место на диске:</span> 65 ГБ</li>
                  </ul>
                </div>
                <div className="us-sysreq-col">
                  <h4>Рекомендуемые</h4>
                  <ul>
                    <li><span>ОС:</span> Windows 11 64-bit</li>
                    <li><span>Процессор:</span> Intel Core i7-12700K / Ryzen 7 5800X</li>
                    <li><span>Память:</span> 16 ГБ ОЗУ</li>
                    <li><span>Видеокарта:</span> NVIDIA RTX 3070 / RX 6800 XT</li>
                    <li><span>Место на диске:</span> 65 ГБ (SSD)</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Отзывы */}
            <ProductReviews gameId={product.id} gameTitle={product.title} />
          </div>

          {/* Правый информационный сайдбар (как в Steam) */}
          <aside className="us-steam-aside">
            <div className="us-steam-aside-card">
              <img src={product.image} alt={product.title} className="us-steam-aside-thumb" />
              <p className="us-steam-aside-short">
                {product.description.length > 155
                  ? `${product.description.slice(0, 155)}...`
                  : product.description}
              </p>

              <div className="us-steam-meta-table">
                <div className="us-meta-row">
                  <span>Дата выхода:</span>
                  <strong>{product.releaseDate} г.</strong>
                </div>
                <div className="us-meta-row">
                  <span>Разработчик:</span>
                  <strong className="us-accent-text">{product.developer}</strong>
                </div>
                <div className="us-meta-row">
                  <span>Платформа:</span>
                  <strong>{product.platform}</strong>
                </div>
              </div>

              <div className="us-steam-tags-block">
                <span className="us-tags-label">Популярные метки:</span>
                <div className="us-tags-cloud">
                  {genreTags.map((tag) => (
                    <span key={tag} className="us-steam-tag">{tag}</span>
                  ))}
                  <span className="us-steam-tag">Достижения</span>
                  <span className="us-steam-tag">Облако</span>
                </div>
              </div>
            </div>

            <div className="us-steam-aside-card">
              <h3 className="us-aside-subtitle">Особенности игры</h3>
              <ul className="us-feature-list">
                <li>
                  <Icon name="gamepad" size={16} />
                  <span>Полная поддержка контроллеров</span>
                </li>
                <li>
                  <Icon name="cloud" size={16} />
                  <span>UnifiedStack Cloud Save</span>
                </li>
                <li>
                  <Icon name="trophy" size={16} />
                  <span>Достижения платформы</span>
                </li>
                <li>
                  <Icon name="library" size={16} />
                  <span>Коллекционные карточки (5 шт.)</span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
