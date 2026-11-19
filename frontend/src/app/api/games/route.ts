import { NextResponse } from "next/server";

const STRAPI_URL =
  process.env.STRAPI_INTERNAL_URL ||
  process.env.NEXT_PUBLIC_STRAPI_URL ||
  "http://127.0.0.1:1337";

/** Серверный прокси каталога: браузер не ходит в Strapi напрямую (CORS). */
export async function GET(request: Request) {
  const incoming = new URL(request.url);
  const params = new URLSearchParams();
  params.set("populate", "*");
  params.set("pagination[pageSize]", "100");

  const sort = incoming.searchParams.get("sort");
  if (sort) params.set("sort", sort);

  try {
    const res = await fetch(`${STRAPI_URL}/api/games?${params.toString()}`, {
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return NextResponse.json(json, { status: res.status });
  } catch (err: any) {
    return NextResponse.json(
      { error: { message: `Strapi недоступен: ${err?.message ?? err}` } },
      { status: 502 }
    );
  }
}
