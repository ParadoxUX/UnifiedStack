"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import { fetchLibrary, purchaseAddon, GameAddon } from "@/lib/wallet";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

/** Дополнения игры: запрос прямо из браузера, как fetchFromStrapi в магазине. */
async function loadAddons(gameId: string): Promise<GameAddon[]> {
  const res = await fetch(
    `${STRAPI_URL}/api/game-addons/by-game/${encodeURIComponent(gameId)}`,
    { cache: "no-store" }
  );
  if (!res.ok) throw new Error(`Каталог недоступен (${res.status})`);
  const json = await res.json();
  const list = Array.isArray(json?.data) ? json.data : Array.isArray(json) ? json : [];
  return list.map((row: any) => {
    const flat = row?.attributes && typeof row.attributes === "object" ? row.attributes : {};
    return {
      ...flat,
      ...row,
      id: row?.id ?? flat.id,
      documentId: row?.documentId ?? flat.documentId,
      Cover: row?.Cover ?? flat.Cover ?? null,
    } as GameAddon;
  });
}

function money(value: number | null | undefined) {
  if (!value) return "Бесплатно";
  return `${value} ₽`;
}

function discountOf(addon: GameAddon) {
  if (!addon.isSale || !addon.oldPrice) return 0;
  if (addon.oldPrice <= addon.Price) return 0;
  return Math.round(((addon.oldPrice - addon.Price) / addon.oldPrice) * 100);
}

export default function AddonList({
  gameId,
  gameTitle,
}: {
  gameId: string;
  gameTitle: string;
}) {
  const [addons, setAddons] = useState<GameAddon[]>([]);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    loadAddons(gameId)
      .then((items) => {
        if (cancelled) return;
        setAddons(items);
        setLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || "Не удалось загрузить дополнения");
        setLoading(false);
      });

    const timer = setTimeout(() => {
      setLoading((prev) => {
        if (prev) setError("Сервер каталога не отвечает");
        return false;
      });
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [gameId]);

  useEffect(() => {
    let cancelled = false;
    fetchLibrary()
      .then((items) => {
        if (cancelled) return;
        const ids = new Set<string>();
        for (const item of items) {
          if (item.status === "refunded") continue;
          const addon = item.addon;
          if (!addon) continue;
          ids.add(String(addon.documentId ?? addon.id));
          ids.add(String(addon.id));
        }
        setOwned(ids);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [gameId]);

  const handleBuy = async (addon: GameAddon) => {
    const key = String(addon.documentId ?? addon.id);
    if (busy) return;

    const user = getCurrentUser();
    if (!user) {
      showToast("Войдите в аккаунт, чтобы купить дополнение", "error");
      return;
    }

    setBusy(key);
    try {
      const result = await purchaseAddon(
        key,
        `purchase_addon_${user.id}_${key}_${Date.now()}`
      );

      setOwned((prev) => new Set(prev).add(key).add(String(addon.id)));

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("us:wallet-updated", { detail: { balance: result.balance } })
        );
        window.dispatchEvent(new Event("us:library-updated"));
      }

      showToast(
        `«${addon.Title}» добавлено в библиотеку. Баланс: ${result.balance} ₽`,
        "success"
      );
    } catch (err: any) {
      const message = err?.message || "Не удалось купить дополнение";
      if (/уже приобретено/i.test(message)) {
        setOwned((prev) => new Set(prev).add(key));
      }
      showToast(message, "error");
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <section className="us-steam-section" data-debug="addons">
        <h2 className="us-steam-section-title">Дополнения и издания</h2>
        <p className="us-addons-empty">Загрузка…</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="us-steam-section" data-debug="addons">
        <h2 className="us-steam-section-title">Дополнения и издания</h2>
        <p className="us-addons-empty">Не удалось загрузить: {error}</p>
      </section>
    );
  }

  if (!addons.length) return null;

  return (
    <section className="us-steam-section">
      <h2 className="us-steam-section-title">Дополнения и издания</h2>

      <div className="us-addons-list">
        {addons.map((addon) => {
          const key = String(addon.documentId ?? addon.id);
          const isOwned = owned.has(key) || owned.has(String(addon.id));
          const percent = discountOf(addon);
          const cover = addon.Cover?.url ? `${STRAPI_URL}${addon.Cover.url}` : null;

          return (
            <div className="us-addon-row" key={key}>
              <div className="us-addon-thumb">
                {cover ? (
                  <img src={cover} alt={addon.Title} />
                ) : (
                  <span className="us-addon-badge">
                    {addon.kind === "edition" ? "Издание" : "DLC"}
                  </span>
                )}
              </div>

              <div className="us-addon-body">
                <div className="us-addon-head">
                  <h3 className="us-addon-title">{addon.Title}</h3>
                  <span className="us-addon-kind">
                    {addon.kind === "edition" ? "Издание" : "DLC"}
                  </span>
                </div>
                {addon.Description ? (
                  <p className="us-addon-desc">{addon.Description}</p>
                ) : null}
                {addon.includesBaseGame ? (
                  <p className="us-addon-included">
                    Включает базовую игру «{gameTitle}»
                  </p>
                ) : null}
              </div>

              <div className="us-addon-buy">
                <div className="us-addon-prices">
                  {percent > 0 ? (
                    <>
                      <span className="us-steam-discount">-{percent}%</span>
                      <span className="us-price-old">{addon.oldPrice} ₽</span>
                    </>
                  ) : null}
                  <span className="us-price-new">{money(addon.Price)}</span>
                </div>

                {isOwned ? (
                  <button className="us-addon-btn us-addon-btn-owned" disabled>
                    В библиотеке ✓
                  </button>
                ) : (
                  <button
                    className="us-addon-btn"
                    onClick={() => handleBuy(addon)}
                    disabled={busy === key}
                  >
                    {busy === key ? "Оплата…" : "Купить"}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
