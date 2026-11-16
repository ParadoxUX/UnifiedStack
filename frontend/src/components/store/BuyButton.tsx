"use client";

import { useState, useEffect } from "react";
import { getCurrentUser } from "@/lib/auth";
import { addUserPoints, checkAchievements } from "@/lib/achievements";
import { grantCardsForGame } from "@/lib/steamCards";
import { showToast } from "@/lib/toast";
import { fetchLibrary, purchaseGame } from "@/lib/wallet";
import { getJSON, setJSON } from "@/lib/storage";

interface BuyButtonProps {
  gameId: string;
  title: string;
  price: string;
  image?: string;
}

export default function BuyButton({ gameId, title, price, image }: BuyButtonProps) {
  const [purchased, setPurchased] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setMounted(true);

    const localLib = getJSON<any[]>("user_game_library", []);
    if (localLib.some((g) => String(g.id) === String(gameId) || g.title === title)) {
      setPurchased(true);
    }

    fetchLibrary()
      .then((items) => {
        if (cancelled) return;
        const owned = items.some(
          (i) =>
            i.status !== "refunded" &&
            (String(i.game?.documentId) === String(gameId) ||
              String(i.game?.id) === String(gameId) ||
              i.game?.Title === title)
        );
        if (owned) setPurchased(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [gameId, title]);

  const handleBuy = async () => {
    if (busy || purchased) return;
    setBusy(true);
    try {
      const user = getCurrentUser();
      if (!user) {
        showToast("Войдите в аккаунт, чтобы купить игру", "error");
        return;
      }

      const uniqueRef = `purchase_${user.id}_${gameId}_${Date.now()}`;
      const result = await purchaseGame(gameId, uniqueRef);

      // Дублируем в локальный реестр для мгновенного отклика карточек и библиотеки
      const currentLib = getJSON<any[]>("user_game_library", []);
      if (!currentLib.some((g) => String(g.id) === String(gameId))) {
        currentLib.push({
          id: gameId,
          title,
          price,
          image: image || "/img/game-placeholder.svg",
          purchaseDate: new Date().toLocaleDateString("ru-RU"),
        });
        setJSON("user_game_library", currentLib);
      }

      addUserPoints(50);
      checkAchievements();
      const grantedCards = grantCardsForGame(gameId, title);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("us:wallet-updated", { detail: { balance: result.balance } }));
        window.dispatchEvent(new Event("us:library-updated"));
      }

      setPurchased(true);
      showToast(
        `«${title}» добавлена в библиотеку! Баланс: ${result.balance} ₽ (+${grantedCards} карточек)`,
        "success"
      );
    } catch (err: any) {
      const message = err?.message || "Не удалось выполнить покупку";
      if (/уже куплена/i.test(message)) {
        setPurchased(true);
        showToast("Эта игра уже есть в вашей библиотеке", "info");
      } else {
        showToast(message, "error");
      }
    } finally {
      setBusy(false);
    }
  };

  if (!mounted) {
    return (
      <button className="product-buy-btn sellgame1" disabled>
        Загрузка...
      </button>
    );
  }

  if (purchased) {
    return (
      <button className="product-buy-btn sellgame1" disabled style={{ background: "rgba(34, 197, 94, 0.2)", borderColor: "#22c55e", color: "#86efac" }}>
        В библиотеке ✓
      </button>
    );
  }

  return (
    <button className="product-buy-btn sellgame1" onClick={handleBuy} disabled={busy}>
      {busy ? "Оплата..." : "Купить"}
    </button>
  );
}
