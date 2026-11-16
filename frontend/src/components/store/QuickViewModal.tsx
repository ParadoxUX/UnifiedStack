"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Icon from "@/components/ui/Icon";
import { getCurrentUser } from "@/lib/auth";
import { fetchWallet, fetchLibrary, purchaseGame } from "@/lib/wallet";
import { getJSON, setJSON } from "@/lib/storage";
import { addUserPoints, checkAchievements } from "@/lib/achievements";
import { grantCardsForGame } from "@/lib/steamCards";
import { showToast } from "@/lib/toast";

export default function QuickViewModal({
  gameId,
  product,
  onClose,
}: {
  gameId: string;
  product: any;
  onClose: () => void;
}) {
  const router = useRouter();

  const title = product?.title ?? "Без названия";
  const developer = product?.developer ?? "Неизвестная студия";
  const genre = product?.genre ?? "Экшен";
  const rawDesc = String(product?.description ?? "Описание отсутствует");
  const description = rawDesc.length > 190 ? `${rawDesc.slice(0, 190)}...` : rawDesc;
  const priceNum = Number(product?.priceNum ?? parseInt(String(product?.price || "0").replace(/\D/g, ""), 10)) || 0;
  const oldPrice = product?.oldPrice ? Number(product.oldPrice) : null;
  const discount = oldPrice && oldPrice > priceNum ? Math.round((1 - priceNum / oldPrice) * 100) : 0;
  const initialImage = product?.image || "/img/game-placeholder.svg";

  const [imgSrc, setImgSrc] = useState(initialImage);
  const [balance, setBalance] = useState<number | null>(null);
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setImgSrc(initialImage);
  }, [initialImage]);

  useEffect(() => {
    const localLib = getJSON<any[]>("user_game_library", []);
    if (localLib.some((g) => String(g.id) === String(gameId) || g.title === title)) {
      setOwned(true);
    }

    const user = getCurrentUser();
    if (user) {
      fetchWallet()
        .then((w) => setBalance(w.balance))
        .catch(() => {});
      fetchLibrary()
        .then((items) => {
          const hasGame = items.some(
            (i) =>
              i.status !== "refunded" &&
              (String(i.game?.documentId) === String(gameId) || i.game?.Title === title)
          );
          if (hasGame) setOwned(true);
        })
        .catch(() => {});
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameId, title, onClose]);

  const handleInstantBuy = async () => {
    if (busy || owned) return;
    const user = getCurrentUser();
    if (!user) {
      showToast("Войдите в аккаунт UnifiedStack для покупки", "error");
      return;
    }

    setBusy(true);
    try {
      const ref = `checkout_${user.id}_${gameId}_${Date.now()}`;
      const res = await purchaseGame(gameId, ref);

      const currentLib = getJSON<any[]>("user_game_library", []);
      if (!currentLib.some((g) => String(g.id) === String(gameId))) {
        currentLib.push({
          id: gameId,
          title,
          price: `${priceNum} ₽`,
          image: imgSrc,
          purchaseDate: new Date().toLocaleDateString("ru-RU"),
        });
        setJSON("user_game_library", currentLib);
      }

      addUserPoints(50);
      checkAchievements();
      const cards = grantCardsForGame(gameId, title);

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("us:wallet-updated", { detail: { balance: res.balance } }));
        window.dispatchEvent(new Event("us:library-updated"));
      }

      setBalance(res.balance);
      setOwned(true);
      showToast(`«${title}» теперь в вашей библиотеке! (+${cards} карточек)`, "success");
    } catch (err: any) {
      showToast(err?.message || "Ошибка при оплате", "error");
    } finally {
      setBusy(false);
    }
  };

  const notEnough = balance !== null && balance < priceNum && !owned;

  return (
    <div className="us-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="us-checkout-modal">
        <button type="button" className="us-modal-close" onClick={onClose} aria-label="Закрыть">
          <Icon name="close" size={18} />
        </button>

        {/* Левая колонка: Обложка и бейджи */}
        <div className="us-checkout-media">
          <img
            src={imgSrc}
            alt={title}
            onError={() => setImgSrc("/img/game-placeholder.svg")}
          />
          <div className="us-checkout-media-overlay">
            <span className="us-tag us-tag-accent">{genre}</span>
            {discount > 0 && <span className="us-badge-discount us-checkout-sale">-{discount}%</span>}
          </div>
        </div>

        {/* Правая колонка: Детали и чекаут */}
        <div className="us-checkout-body">
          <div className="us-checkout-kicker">ЦИФРОВАЯ ЛИЦЕНЗИЯ • PC</div>
          <h2 className="us-checkout-title">{title}</h2>
          <div className="us-checkout-studio">Студия: <strong>{developer}</strong></div>

          <p className="us-checkout-desc">{description}</p>

          {/* Чек-сводка */}
          <div className="us-checkout-receipt">
            <div className="us-receipt-row">
              <span>Ваш кошелёк</span>
              <strong style={{ color: notEnough ? "#f87171" : "#38bdf8" }}>
                {balance !== null ? `${balance} ₽` : "Войдите в аккаунт"}
              </strong>
            </div>

            {discount > 0 && (
              <div className="us-receipt-row">
                <span>Скидка каталога</span>
                <strong style={{ color: "#4ade80" }}>-{oldPrice! - priceNum} ₽</strong>
              </div>
            )}

            <div className="us-receipt-total">
              <span>Итого к списанию</span>
              <div className="us-receipt-price-wrap">
                {discount > 0 && <span className="us-price-old">{oldPrice} ₽</span>}
                <span className="us-receipt-final">{priceNum === 0 ? "Бесплатно" : `${priceNum} ₽`}</span>
              </div>
            </div>
          </div>

          <div className="us-checkout-actions">
            <button
              type="button"
              className="us-btn-secondary"
              onClick={() => {
                onClose();
                router.push(`/store/${gameId}`);
              }}
            >
              Подробнее
            </button>

            {owned ? (
              <button
                type="button"
                className="btn-auth-launch"
                style={{ background: "linear-gradient(135deg, #16a34a, #059669)", flex: 1, justifyContent: "center" }}
                onClick={() => {
                  onClose();
                  router.push("/library");
                }}
              >
                Открыть в библиотеке
              </button>
            ) : (
              <button
                type="button"
                className="btn-auth-launch"
                style={{ flex: 1, justifyContent: "center" }}
                disabled={busy || notEnough}
                onClick={handleInstantBuy}
              >
                <Icon name="wallet" size={16} />
                <span>
                  {busy
                    ? "Оплата..."
                    : notEnough
                    ? "Недостаточно средств"
                    : priceNum === 0
                    ? "Забрать бесплатно"
                    : `Оплатить ${priceNum} ₽`}
                </span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
