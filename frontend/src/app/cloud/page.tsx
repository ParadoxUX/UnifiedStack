"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { fetchGames, fetchTariffs } from "@/lib/strapi";
import {
  getActiveSession,
  getSessionHistory,
  startSession,
  stopSession,
  CloudSession,
} from "@/lib/cloud";
import Icon from "@/components/ui/Icon";
import { showToast } from "@/lib/toast";

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || "http://127.0.0.1:1337";

const DURATIONS = [
  { minutes: 30, label: "30 минут" },
  { minutes: 60, label: "1 час" },
  { minutes: 180, label: "3 часа" },
  { minutes: 720, label: "24 часа" },
];

const SERVERS = [
  "EU-Central (Франкфурт · 18 мс)",
  "RU-West (Москва · 12 мс)",
  "RU-Siberia (Новосибирск · 29 мс)",
];

function coverOf(game: any) {
  return game?.Cover?.url ? `${STRAPI_URL}${game.Cover.url}` : "/img/game-placeholder.svg";
}

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function dateOf(iso?: string) {
  return iso
    ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })
    : "—";
}

export default function CloudPage() {
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [games, setGames] = useState<any[]>([]);
  const [session, setSession] = useState<CloudSession | null>(null);
  const [history, setHistory] = useState<CloudSession[]>([]);
  const [accountPrice, setAccountPrice] = useState(3990);
  const [minutes, setMinutes] = useState(60);
  const [server, setServer] = useState(SERVERS[0]);
  const [kind, setKind] = useState<"timed" | "account">("timed");
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());

  const refresh = useCallback(() => {
    getActiveSession()
      .then((r) => {
        setSession(r.session);
        setAccountPrice(r.accountPrice || 3990);
      })
      .catch(() => setSession(null));
    getSessionHistory().then(setHistory).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTariffs().then(setTariffs).catch(() => {});
    fetchGames()
      .then((data) => {
        const deals = data.filter((g: any) => {
          const price = Number(g.Price ?? 0);
          const old = Number(g.oldPrice ?? 0);
          return price === 0 || old > price || g.isSale === true;
        });
        setGames(deals.slice(0, 8));
      })
      .catch(() => {});
    refresh();
  }, [refresh]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const tariff = useMemo(() => tariffs[0] ?? null, [tariffs]);
  const hourPrice = Number(tariff?.Price ?? 49);
  const price = kind === "account" ? accountPrice : Math.round((hourPrice * minutes) / 60);

  const remaining = session?.endsAt
    ? new Date(session.endsAt).getTime() - now
    : 0;
  const progress = session?.minutesTotal
    ? Math.max(0, Math.min(100, (remaining / (session.minutesTotal * 60_000)) * 100))
    : 100;

  const handleStart = async () => {
    if (!tariff || busy) return;
    setBusy(true);
    try {
      const result = await startSession({
        tariffId: String(tariff.documentId ?? tariff.id),
        minutes,
        server,
        kind,
      });
      setSession(result.session);
      showToast(
        kind === "account"
          ? "Аккаунт куплен — доступ бессрочный"
          : `Сессия запущена на ${minutes} мин · списано ${result.price} ₽`,
        "success"
      );
      refresh();
    } catch (err: any) {
      showToast(err?.message || "Не удалось запустить сессию", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleStop = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const result = await stopSession();
      setSession(null);
      showToast(
        result.refund > 0
          ? `Сессия остановлена · возвращено ${result.refund} ₽`
          : "Сессия остановлена",
        "success"
      );
      refresh();
    } catch (err: any) {
      showToast(err?.message || "Не удалось остановить сессию", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ur-page ur-club">
      <div className="ur-page-head">
        <div>
          <p className="ur-kicker">UnifiedStack Cloud</p>
          <h1 className="ur-title">Компьютерный клуб</h1>
          <p className="ur-subtitle">
            Мощный ПК на время: платите за минуты, возвращайте остаток и играйте без установки
          </p>
        </div>
        <Link className="ur-btn ur-btn--ghost" href="/store">
          <Icon name="store" size={16} /> В каталог игр
        </Link>
      </div>

      {session ? (
        <section className="ur-session-card">
          <div className="ur-session-top">
            <div>
              <p className="ur-kicker">
                {session.kind === "account" ? "Постоянный доступ" : "Активная сессия"}
              </p>
              <h2>{session.game?.Title || "Выберите игру"}</h2>
              <p className="ur-subtitle">{session.server}</p>
            </div>
            <span className="ur-session-status">● онлайн</span>
          </div>

          {session.kind === "timed" ? (
            <>
              <div className="ur-session-clock">{formatClock(remaining)}</div>
              <div className="ur-session-bar">
                <i style={{ width: `${progress}%` }} />
              </div>
              <p className="ur-subtitle">
                Осталось минут: {Math.ceil(remaining / 60_000)} из {session.minutesTotal}
              </p>
            </>
          ) : (
            <div className="ur-session-clock ur-session-clock--forever">∞</div>
          )}

          <div className="ur-session-actions">
            <Link className="ur-btn ur-btn--primary" href="/store">
              <Icon name="gamepad" size={16} /> Выбрать игру
            </Link>
            {session.kind === "timed" && (
              <button className="ur-btn ur-btn--danger" onClick={handleStop} disabled={busy}>
                Остановить и вернуть остаток
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="ur-club-setup">
          <div className="ur-club-options">
            <div className="ur-forum-side-title">Длительность сессии</div>
            <div className="ur-chip-row">
              {DURATIONS.map((d) => (
                <button
                  key={d.minutes}
                  className={`ur-chip ${kind === "timed" && minutes === d.minutes ? "is-active" : ""}`}
                  onClick={() => {
                    setKind("timed");
                    setMinutes(d.minutes);
                  }}
                >
                  {d.label}
                </button>
              ))}
              <button
                className={`ur-chip ${kind === "account" ? "is-active" : ""}`}
                onClick={() => setKind("account")}
              >
                Купить аккаунт навсегда
              </button>
            </div>

            <div className="ur-forum-side-title" style={{ marginTop: 18 }}>Сервер</div>
            <select
              className="ur-friends-search"
              value={server}
              onChange={(e) => setServer(e.target.value)}
            >
              {SERVERS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>

            <div className="ur-club-price">
              <span>{kind === "account" ? "Постоянный доступ" : `${minutes} мин · ${hourPrice} ₽/час`}</span>
              <strong>{price} ₽</strong>
            </div>
            <button className="ur-btn ur-btn--primary" onClick={handleStart} disabled={busy || !tariff}>
              {busy ? "Подключаем…" : kind === "account" ? "Купить аккаунт" : "Запустить сессию"}
            </button>
            <p className="ur-subtitle" style={{ marginTop: 12 }}>
              Остаток времени вернётся на баланс, если закончить сессию досрочно.
            </p>
          </div>

          <div className="ur-club-info">
            <div className="ur-stat-card"><b>{hourPrice} ₽</b><span>за час игры</span></div>
            <div className="ur-stat-card"><b>{accountPrice} ₽</b><span>аккаунт навсегда</span></div>
            <div className="ur-stat-card"><b>120 FPS</b><span>мощность серверов</span></div>
            <div className="ur-stat-card"><b>0 ₽</b><span>скачивание игр</span></div>
          </div>
        </section>
      )}

      <section style={{ marginTop: 34 }}>
        <div className="ur-page-head">
          <div>
            <p className="ur-kicker">В клубе</p>
            <h2 className="ur-title" style={{ fontSize: 24 }}>Бесплатно и по скидке</h2>
            <p className="ur-subtitle">Можно играть в клубе сразу после запуска сессии</p>
          </div>
        </div>
        <div className="ur-deal-grid">
          {games.map((g) => {
            const price = Number(g.Price ?? 0);
            const old = Number(g.oldPrice ?? 0);
            const d = old > price ? Math.round((1 - price / old) * 100) : 0;
            return (
              <Link className="ur-deal" key={g.documentId ?? g.id} href={`/store/${g.documentId ?? g.id}`}>
                <div className="ur-deal-cover">
                  <img src={coverOf(g)} alt={g.Title} loading="lazy" />
                  <span className="ur-deal-discount">{price === 0 ? "FREE" : d ? `−${d}%` : "КЛУБ"}</span>
                </div>
                <div className="ur-deal-body">
                  <h3 className="ur-deal-title">{g.Title}</h3>
                  <div className="ur-deal-prices">
                    {d > 0 && <span className="ur-deal-old">{old} ₽</span>}
                    <span className="ur-deal-price">{price === 0 ? "Бесплатно" : `${price} ₽`}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {history.length > 0 && (
        <section style={{ marginTop: 34 }}>
          <div className="ur-forum-side-title">История сессий</div>
          {history.map((s) => (
            <div className="ur-friend" key={s.id} style={{ cursor: "default" }}>
              <div className="ur-avatar"><Icon name="cloud" size={18} /></div>
              <div className="ur-friend-meta">
                <div className="ur-friend-name">
                  {s.kind === "account" ? "Аккаунт навсегда" : `${s.minutesTotal} мин`} · {s.server}
                </div>
                <div className="ur-friend-sub">
                  {dateOf(s.startedAt)} · {s.status}
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
