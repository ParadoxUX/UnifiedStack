"use client";

import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import { fetchLibrary, purchaseDlc } from "@/lib/wallet";

interface Props {
  dlcId: string;
  title: string;
  price: number;
}

export default function DlcBuyButton({ dlcId, title, price }: Props) {
  const [owned, setOwned] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetchLibrary()
      .then((items) => {
        if (cancelled) return;
        const has = items.some(
          (i) =>
            i.status !== "refunded" &&
            (String(i.dlc?.documentId) === String(dlcId) ||
              String(i.dlc?.id) === String(dlcId))
        );
        if (has) setOwned(true);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dlcId]);

  const handleBuy = async () => {
    if (busy || owned) return;
    const user = getCurrentUser();
    if (!user) {
      showToast("Войдите в аккаунт, чтобы купить дополнение", "error");
      return;
    }
    setBusy(true);
    try {
      const result = await purchaseDlc(dlcId, `dlc_${user.id}_${dlcId}_${Date.now()}`);
      setOwned(true);
      showToast(`«${title}» куплено · баланс ${result.balance} ₽`, "success");
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("us:wallet-updated", { detail: { balance: result.balance } }));
        window.dispatchEvent(new Event("us:library-updated"));
      }
    } catch (err: any) {
      const message = err?.message || "Не удалось купить дополнение";
      if (/уже приобретено/i.test(message)) {
        setOwned(true);
        showToast("Это дополнение уже у вас есть", "info");
      } else {
        showToast(message, "error");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <button className="ur-dlc-buy" onClick={handleBuy} disabled={busy || owned}>
      {owned ? "Куплено ✓" : busy ? "Оплата…" : `${price} ₽ · Купить`}
    </button>
  );
}
