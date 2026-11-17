import { Metadata } from "next";
import { fetchFromStrapi } from "@/lib/strapi";
import { imageUrl, videoUrl, imageUrls, firstVideoLink } from "@/lib/media";
import { notFound } from "next/navigation";
import Link from "next/link";
import ProductDescription from "@/components/store/ProductDescription";
import BuyButton from "@/components/store/BuyButton";
import ProductReviews from "@/components/store/ProductReviews";
import GameMedia, { type Screenshot } from "@/components/store/GameMedia";
import Icon from "@/components/ui/Icon";

const PLACEHOLDER = "/img/game-placeholder.svg";

function normalize(raw: any) {
  if (!raw) return null;
  const g = Array.isArray(raw) ? raw[0] : raw;
  if (!g) return null;

  const image = imageUrl(g.Cover) || PLACEHOLDER;
  // Видео из админки: компонент Trailers со ссылками (YouTube/Vimeo/mp4).
  // media-поле Trailer поддерживается как запасной вариант.
  const trailerSource = firstVideoLink(g.Trailers);
  const trailerFile = videoUrl(g.Trailer);
  const trailer = trailerSource ?? (trailerFile ? { kind: "file" as const, url: trailerFile } : null);
  const screenshots: Screenshot[] = imageUrls(g.Screenshots).map((url, i) => ({
    url,
    alt: `${g.Title || "Игра"} — скриншот ${i + 1}`,
  }));

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
    image,
    trailer,
    screenshots,
    isSale: Boolean(g.isSale),
    oldPrice: g.oldPrice,
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
          {/* Левая основная колонка: видео → скриншоты → покупка → описание */}
          <div className="us-steam-main">
            <GameMedia
              title={product.title}
              trailer={product.trailer}
              screenshots={product.screenshots}
              cover={product.image}
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

          {/* Правый информационный сайдбар: обложка + метаданные */}
          <aside className="us-steam-aside">
            <div className="us-steam-aside-card">
              <div className="us-steam-cover-wrap">
                <img
                  src={product.image}
                  alt={product.title}
                  className="us-steam-aside-thumb"
                />
              </div>
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
