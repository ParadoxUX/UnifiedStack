import { Metadata } from "next";
import { fetchFromStrapi, normalizeGame } from "@/lib/strapi";
import { notFound } from "next/navigation";
import Link from "next/link";
import BuyButton from "@/components/store/BuyButton";
import GameGallery from "@/components/store/GameGallery";
import ProductReviews from "@/components/store/ProductReviews";

// SEO-метаданные
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
  const product = normalizeGame(raw);
  if (!product) return { title: "Игра не найдена | AMPLIGAME" };

  return {
    title: `${product.title} — купить в AMPLIGAME`,
    description: product.description.substring(0, 160),
  };
}

// Основной компонент
export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let raw: any = null;
  try {
    raw = await fetchFromStrapi(`games/${id}`);
  } catch (e) {
    console.error(e);
  }

  const product = normalizeGame(raw);
  if (!product) notFound();

  const discount =
    product.isSale && product.oldPrice && product.oldPrice > product.priceNum
      ? Math.round(
          ((product.oldPrice - product.priceNum) / product.oldPrice) * 100
        )
      : 0;

  return (
    <div
      style={{
        background:
          "radial-gradient(circle at 50% 0%, #2a1345 0%, #0d0716 70%)",
        minHeight: "100vh",
        color: "#c7d5e0",
        padding: "20px 20px",
      }}
    >
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        {/* Хлебные крошки */}
        <div
          style={{ fontSize: "12px", color: "#8f98a0", marginBottom: "20px" }}
        >
          <Link
            href="/store"
            style={{ color: "#8f98a0", textDecoration: "none" }}
          >
            Все игры
          </Link>{" "}
          &gt; {product.title}
        </div>

        {/* Заголовок игры */}
        <h1 style={{ color: "#fff", fontSize: "28px", marginBottom: "20px" }}>
          {product.title}
        </h1>

        {/* Горизонтальный блок: Галерея слева, Инфо справа */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr",
            gap: "20px",
            alignItems: "start",
          }}
        >
          {/* ЛЕВАЯ ЧАСТЬ: Видео и скриншоты */}
          <GameGallery
            videoUrl={product.videoUrl}
            screenshots={product.screenshots}
            mainImage={product.image}
          />

          {/* ПРАВАЯ ЧАСТЬ: Описание, дата выхода, теги, кнопка */}
          <div>
            {/* Обложка справа */}
            <img
              src={product.image}
              alt={product.title}
              style={{
                width: "100%",
                maxWidth: "200px",
                borderRadius: "8px",
                marginBottom: "15px",
              }}
            />

            <p
              style={{
                fontSize: "14px",
                lineHeight: 1.6,
                color: "#c7d5e0",
                marginBottom: "20px",
              }}
            >
              {product.description}
            </p>

            {/* Таблица с информацией */}
            <div
              style={{
                fontSize: "13px",
                color: "#8f98a0",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span>ДАТА ВЫХОДА:</span>
                <span style={{ color: "#c7d5e0" }}>{product.releaseDate}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span>РАЗРАБОТЧИК:</span>
                <span style={{ color: "#c7d5e0" }}>{product.developer}</span>
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "5px",
                }}
              >
                <span>ЖАНР:</span>
                <span style={{ color: "#c7d5e0" }}>{product.genre}</span>
              </div>
            </div>

            {/* Теги */}
            {product.tags.length > 0 && (
              <div style={{ marginBottom: "20px" }}>
                <p
                  style={{
                    fontSize: "12px",
                    color: "#8f98a0",
                    marginBottom: "8px",
                  }}
                >
                  Популярные метки:
                </p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                  {product.tags.map((tag: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        background: "#2a1b3d",
                        color: "#b4a8ff",
                        padding: "2px 8px",
                        borderRadius: "4px",
                        fontSize: "12px",
                        border: "1px solid #8f3ed1",
                      }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Блок с ценой и кнопкой */}
            <div
              style={{
                background: "rgba(0,0,0,0.4)",
                padding: "15px",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: "10px",
                border: "1px solid #2a1b3d",
              }}
            >
              {discount > 0 ? (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "10px" }}
                >
                  <span
                    style={{
                      textDecoration: "line-through",
                      color: "#888",
                      fontSize: "16px",
                    }}
                  >
                    {product.oldPrice} ₽
                  </span>
                  <span
                    style={{
                      color: "#4caf50",
                      fontSize: "24px",
                      fontWeight: "bold",
                    }}
                  >
                    {product.price}
                  </span>
                  <span
                    style={{
                      background: "#ff4444",
                      color: "#fff",
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "12px",
                    }}
                  >
                    -{discount}%
                  </span>
                </div>
              ) : (
                <span
                  style={{
                    color: "#8f3ed1",
                    fontSize: "24px",
                    fontWeight: "bold",
                  }}
                >
                  {product.price}
                </span>
              )}

              <BuyButton
                gameId={product.id}
                title={product.title}
                price={product.price}
                image={product.image}
              />
            </div>
          </div>
        </div>

        {/* Обзоры */}
        <div style={{ marginTop: "40px" }}>
          <ProductReviews gameId={product.id} gameTitle={product.title} />
        </div>
      </div>
    </div>
  );
}
