"use client";

import { useEffect, useState } from "react";
import { fetchTariffs } from "@/lib/strapi";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/lib/toast";
import { getCurrentUser } from "@/lib/auth";
import { withdraw } from "@/lib/wallet";

const FEATURES = [
  {
    icon: "wallet" as const,
    title: "Плати только за время",
    desc: "Запускайте требовательные хиты без апгрейда ПК — списание только за фактические минуты в игре.",
  },
  {
    icon: "cloud" as const,
    title: "Поминутный возврат",
    desc: "Завершили катку раньше срока? Неиспользованный остаток времени автоматически возвращается на баланс.",
  },
  {
    icon: "gamepad" as const,
    title: "Серверы 120 FPS",
    desc: "Выбирайте ближайший дата-центр с минимальным пингом и аппаратным кодированием AV1.",
  },
  {
    icon: "library" as const,
    title: "Единые облачные сейвы",
    desc: "Весь прогресс синхронизируется с вашей библиотекой UnifiedStack — продолжайте с любого устройства.",
  },
];

export default function CloudPage() {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedServer, setSelectedServer] = useState("EU-Central (Frankfurt • 18 ms)");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    fetchTariffs()
      .then((data) => setTariffs(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleActivateTariff = async (tariff: any) => {
    const user = getCurrentUser();
    if (!user) {
      showToast("Войдите в аккаунт для запуска облачной сессии", "error");
      return;
    }

    const price = Number(tariff.Price || 0);
    const id = String(tariff.documentId || tariff.id);
    if (busyId) return;
    setBusyId(id);

    try {
      const wallet = await withdraw(price, `cloud_${id}_${Date.now()}`);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("us:wallet-updated", { detail: { balance: wallet.balance } }));
      }
      showToast(`Тариф «${tariff.Title}» активирован (${selectedServer}). Баланс: ${wallet.balance} ₽`, "success");
    } catch (err: any) {
      showToast(err?.message || "Недостаточно средств на балансе", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="us-cloud-page">
      <div className="us-cloud-hero">
        <span className="us-checkout-kicker">UNIFIED STACK CLOUD GAMING</span>
        <h1 className="us-cloud-title">Почему UnifiedStack Cloud?</h1>
        <p className="us-cloud-sub">
          Мгновенный запуск игр из вашей библиотеки на облачных GPU-серверах без установки и скачивания.
        </p>

        <div className="us-server-picker">
          <span>Сервер подключения:</span>
          <select
            value={selectedServer}
            onChange={(e) => setSelectedServer(e.target.value)}
            className="us-server-select"
          >
            <option>EU-Central (Frankfurt • 18 ms)</option>
            <option>RU-West (Москва • 12 ms)</option>
            <option>RU-Siberia (Новосибирск • 29 ms)</option>
          </select>
        </div>
      </div>

      <div className="us-cloud-features">
        {FEATURES.map((f) => (
          <div key={f.title} className="us-cloud-feature-card">
            <div className="us-cloud-feature-icon">
              <Icon name={f.icon} size={22} />
            </div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="us-cloud-tariffs-section">
        <h2 className="us-cloud-section-title">Выберите облачный кластер</h2>

        {loading ? (
          <div className="us-cloud-tariffs-grid">
            {[1, 2, 3].map((n) => (
              <div key={n} className="us-skel-box" style={{ height: "280px" }} />
            ))}
          </div>
        ) : (
          <div className="us-cloud-tariffs-grid">
            {tariffs.map((t, idx) => {
              const id = String(t.documentId || t.id);
              const isPopular = idx === 1;
              const lines = String(t.features_list || "")
                .split("\n")
                .map((l) => l.trim())
                .filter(Boolean);

              return (
                <div key={id} className={`us-tariff-card ${isPopular ? "is-popular" : ""}`}>
                  {isPopular && <span className="us-tariff-badge">Популярный выбор</span>}
                  <h3>{t.Title}</h3>
                  <div className="us-tariff-price">
                    <strong>{t.Price} ₽</strong>
                    <span>/ час</span>
                  </div>

                  <ul className="us-tariff-features">
                    {lines.map((line, i) => (
                      <li key={i}>
                        <span className="us-tariff-check">✓</span>
                        <span>{line}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    className="btn-auth-launch"
                    style={{ width: "100%", justifyContent: "center", marginTop: "auto" }}
                    disabled={busyId === id}
                    onClick={() => handleActivateTariff(t)}
                  >
                    {busyId === id ? "Подключение..." : "Запустить сессию"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <p className="us-cloud-note">
          * Платные игры из каталога запускаются в облаке автоматически при наличии их в вашей библиотеке UnifiedStack.
        </p>
      </div>
    </div>
  );
}
