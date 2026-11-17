import { fetchFromStrapi } from "@/lib/strapi";
import { imageUrl } from "@/lib/media";
import GameGrid from "@/components/store/GameGrid";
import MyLibraryPreview from "@/components/store/MyLibraryPreview";
import SwiperBanner from "@/components/store/SwiperBanner";
import Icon from "@/components/ui/Icon";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let games: any[] = [];

  try {
    const result = await fetchFromStrapi("games");
    const raw = Array.isArray(result) ? result : result?.data ?? [];

    games = raw.map((g: any) => ({
      ...g,
      id: g.documentId ?? g.id,
      title: g.Title || "Без названия",
      price: g.Price ?? 0,
      description: g.Description || "",
      developer: g.developer || "Неизвестная студия",
      genre: g.Genre || "Экшен",
      image: imageUrl(g.Cover) || "/img/game-placeholder.svg",
    }));
  } catch {
    games = [];
  }

  return (
    <main className="store-main">
      <SwiperBanner />
      <MyLibraryPreview />

      <section className="store-content">
        <div className="section-header-row" style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Icon name="fire" size={22} />
          <h2 className="store-games-title" style={{ margin: 0 }}>Популярное в каталоге</h2>
        </div>
        <GameGrid games={games} searchQuery="" />
      </section>
    </main>
  );
}
