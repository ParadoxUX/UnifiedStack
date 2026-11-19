import { fetchFromStrapi } from "@/lib/strapi";
import HomeShowcase from "@/components/store/HomeShowcase";
import MyLibraryPreview from "@/components/store/MyLibraryPreview";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  let games: any[] = [];

  try {
    const result = await fetchFromStrapi("games");
    games = Array.isArray(result) ? result : result?.data ?? [];
  } catch {
    games = [];
  }

  return (
    <main className="store-main">
      <HomeShowcase games={games} />
      <div style={{ maxWidth: "1440px", margin: "0 auto", padding: "0 28px" }}>
        <MyLibraryPreview />
      </div>
    </main>
  );
}
