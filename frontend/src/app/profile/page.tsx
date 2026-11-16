'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getJSON, setJSON, getItem, setItem } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { ACHIEVEMENTS_DEFINITIONS } from '@/data/achievements';
import { fetchLibrary } from '@/lib/wallet';
import { fetchGames } from '@/lib/strapi';
import {
  getCards,
  getBadges,
  getCraftableGames,
  craftBadge,
  sellCardForPoints,
  openBoosterPack,
  SteamCard,
} from '@/lib/steamCards';
import SteamCardComp from '@/components/library/SteamCard';
import PointsShop from '@/components/shop/PointsShop';
import EmptyState from '@/components/ui/EmptyState';
import Icon from '@/components/ui/Icon';
import { showToast } from '@/lib/toast';

const STRAPI_URL = process.env.NEXT_PUBLIC_STRAPI_URL || 'http://127.0.0.1:1337';

const BANNER_THEMES: Record<string, { label: string; bg: string }> = {
  saturn: {
    label: 'Орбита Сатурна',
    bg: 'linear-gradient(125deg, #3b0764 0%, #6d28d9 45%, #0284c7 100%)',
  },
  cyber: {
    label: 'Кибер-неон',
    bg: 'linear-gradient(125deg, #0f172a 0%, #7c3aed 50%, #ec4899 100%)',
  },
  aurora: {
    label: 'Северное сияние',
    bg: 'linear-gradient(125deg, #064e3b 0%, #0ea5e9 52%, #6366f1 100%)',
  },
  eclipse: {
    label: 'Тёмное затмение',
    bg: 'linear-gradient(125deg, #090d16 0%, #1e1b4b 55%, #312e81 100%)',
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  online: { label: 'В сети', color: '#22c55e' },
  away: { label: 'Отошёл', color: '#f59e0b' },
  dnd: { label: 'Не беспокоить', color: '#ef4444' },
  invisible: { label: 'Невидимка', color: '#64748b' },
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'games' | 'cards' | 'media' | 'notes'>('games');
  const [showShop, setShowShop] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);

  // Discord-style profile state
  const [displayName, setDisplayName] = useState('');
  const [customActivity, setCustomActivity] = useState('');
  const [bio, setBio] = useState('');
  const [status, setStatus] = useState('online');
  const [bannerTheme, setBannerTheme] = useState('saturn');
  const [customBanner, setCustomBanner] = useState('');
  const [customAvatar, setCustomAvatar] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  // Collections
  const [games, setGames] = useState<any[]>([]);
  const [cards, setCards] = useState<SteamCard[]>([]);
  const [badges, setBadges] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [unlockedAch, setUnlockedAch] = useState<string[]>([]);
  const [points, setPoints] = useState(0);
  const [noteForm, setNoteForm] = useState({ title: '', text: '' });

  const loadData = useCallback(async () => {
    const current = getCurrentUser();
    setUser(current);

    setDisplayName(getItem('us_profile_display_name') || current?.username || 'Игрок');
    setCustomActivity(getItem('us_profile_activity') || 'Исследует каталог UnifiedStack');
    setBio(getItem('user_bio') || '');
    setStatus(getItem('user_status') || 'online');
    setBannerTheme(getItem('us_profile_banner_theme') || 'saturn');
    setCustomBanner(getItem('us_profile_custom_banner') || '');
    setCustomAvatar(getItem('us_profile_custom_avatar') || current?.avatar || '/img/default-avatar.svg');

    setScreenshots(getJSON('user_screenshots', []));
    setNotes(getJSON('user_guides', []));
    setUnlockedAch(getJSON('user_achievements', []));
    setPoints(parseInt(getItem('user_points') || '0', 10) || 0);
    setCards(getCards());
    setBadges(getBadges());

    // Синхронизируем игры из Strapi + localStorage
    const localGames = getJSON<any[]>('user_game_library', []);
    let strapiItems: any[] = [];
    let catalog: any[] = [];
    try { catalog = await fetchGames(); } catch {}
    try { strapiItems = await fetchLibrary(); } catch {}

    const map = new Map<string, any>();
    for (const item of strapiItems) {
      if (item.status === 'refunded' || !item.game) continue;
      const docId = String(item.game.documentId || item.game.id);
      const full = catalog.find((c) => String(c.documentId) === docId || String(c.id) === String(item.game.id));
      map.set(docId, {
        id: docId,
        title: item.game.Title || full?.Title || 'Игра',
        genre: full?.Genre || 'PC',
        image: full?.Cover?.url ? `${STRAPI_URL}${full.Cover.url}` : '/img/game-placeholder.svg',
        purchaseDate: item.purchasedAt ? new Date(item.purchasedAt).toLocaleDateString('ru-RU') : 'В коллекции',
      });
    }
    for (const lg of localGames) {
      if (!lg?.id) continue;
      const key = String(lg.id);
      if (!map.has(key)) {
        const full = catalog.find((c) => String(c.documentId) === key || c.Title === lg.title);
        map.set(key, {
          ...lg,
          id: key,
          genre: full?.Genre || 'PC',
          image: full?.Cover?.url ? `${STRAPI_URL}${full.Cover.url}` : lg.image || '/img/game-placeholder.svg',
        });
      }
    }
    setGames(Array.from(map.values()));
  }, []);

  useEffect(() => {
    setMounted(true);
    loadData();
  }, [loadData]);

  const handleSaveProfile = () => {
    setItem('us_profile_display_name', displayName.trim() || user?.username || 'Игрок');
    setItem('us_profile_activity', customActivity.trim());
    setItem('user_bio', bio.trim());
    setItem('us_profile_banner_theme', bannerTheme);
    setIsEditingProfile(false);
    showToast('Профиль обновлён', 'success');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'avatar' | 'banner' | 'screenshot') => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2_500_000) {
      showToast('Максимальный размер файла — 2.5 МБ', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      if (target === 'avatar') {
        setCustomAvatar(base64);
        setItem('us_profile_custom_avatar', base64);
        showToast('Аватар обновлён', 'success');
      } else if (target === 'banner') {
        setCustomBanner(base64);
        setItem('us_profile_custom_banner', base64);
        showToast('Баннер профиля обновлён', 'success');
      } else {
        const next = [...screenshots, { id: Date.now(), src: base64, date: new Date().toLocaleDateString('ru-RU') }];
        setScreenshots(next);
        setJSON('user_screenshots', next);
        showToast('Скриншот добавлен в галерею', 'success');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    setItem('user_status', newStatus);
    setShowStatusMenu(false);
    showToast(`Статус: ${STATUS_CONFIG[newStatus].label}`, 'info');
  };

  const handleSellCard = (cardId: string) => {
    const updatedPoints = sellCardForPoints(cardId);
    if (updatedPoints > 0) {
      setPoints(updatedPoints);
      setCards(getCards());
      showToast('Карточка продана за +40 поинтов', 'success');
    }
  };

  const handleBuyBooster = (gameId: string, gameTitle: string, image?: string) => {
    const res = openBoosterPack(gameId, gameTitle, image);
    if (!res.ok) {
      showToast(res.error || 'Недостаточно поинтов', 'error');
      return;
    }
    loadData();
    showToast(`Открыт бустер «${gameTitle}»: получено +2 карточки!`, 'success');
  };

  const handleCraft = (gameId: string) => {
    if (craftBadge(gameId)) {
      loadData();
      showToast('Значок скрафчен! Награда: +250 поинтов и повышение уровня', 'success');
    }
  };

  const handleAddNote = () => {
    if (!noteForm.title.trim() || !noteForm.text.trim()) return;
    const next = [...notes, { ...noteForm, date: new Date().toLocaleDateString('ru-RU') }];
    setNotes(next);
    setJSON('user_guides', next);
    setNoteForm({ title: '', text: '' });
    showToast('Заметка опубликована', 'success');
  };

  if (!mounted) return null;

  if (!user) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
        <EmptyState
          title="Вы не вошли в аккаунт"
          desc="Авторизуйтесь через кнопку в правом верхнем углу, чтобы открыть свой профиль, библиотеку и карточки."
          linkText="Вернуться в магазин"
          linkHref="/store"
        />
      </div>
    );
  }

  const unlockedAchievements = ACHIEVEMENTS_DEFINITIONS.filter((a) => unlockedAch.includes(a.id));
  const craftable = getCraftableGames();
  const level = Math.max(1, Math.floor(points / 250) + badges.length * 2 + 1);

  const cardsByGame = cards.reduce((acc: Record<string, SteamCard[]>, c) => {
    if (!acc[c.gameId]) acc[c.gameId] = [];
    acc[c.gameId].push(c);
    return acc;
  }, {});

  const bannerStyle = customBanner
    ? { backgroundImage: `url("${customBanner}")`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: BANNER_THEMES[bannerTheme]?.bg || BANNER_THEMES.saturn.bg };

  return (
    <div className="us-dc-page">
      {showShop && <PointsShop onClose={() => { setShowShop(false); loadData(); }} />}

      <div className="us-dc-shell">
        {/* Левая Discord-карточка профиля */}
        <aside className="us-dc-card">
          <div className="us-dc-banner" style={bannerStyle}>
            <button
              type="button"
              className="us-dc-edit-trigger"
              onClick={() => setIsEditingProfile(!isEditingProfile)}
            >
              {isEditingProfile ? 'Закрыть' : 'Редактировать профиль'}
            </button>
          </div>

          <div className="us-dc-avatar-row">
            <div className="us-dc-avatar-wrap">
              <img src={customAvatar || '/img/default-avatar.svg'} alt={displayName} />
              <button
                type="button"
                className="us-dc-status-dot"
                style={{ background: STATUS_CONFIG[status]?.color || '#22c55e' }}
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                title="Сменить статус"
              />
            </div>

            <div className="us-dc-level-pill">
              <span>УР.</span>
              <strong>{level}</strong>
            </div>
          </div>

          {showStatusMenu && (
            <div className="us-dc-status-popover">
              {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                <button key={key} type="button" onClick={() => handleStatusChange(key)}>
                  <span style={{ background: cfg.color }} />
                  {cfg.label}
                </button>
              ))}
            </div>
          )}

          {/* Панель редактирования профиля (как в Discord) */}
          {isEditingProfile ? (
            <div className="us-dc-editor">
              <label className="us-pay-label">Отображаемое имя</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="us-pay-input"
              />

              <label className="us-pay-label" style={{ marginTop: '10px' }}>Игровой статус</label>
              <input
                type="text"
                value={customActivity}
                onChange={(e) => setCustomActivity(e.target.value)}
                placeholder="Во что играете или чем заняты..."
                className="us-pay-input"
              />

              <label className="us-pay-label" style={{ marginTop: '10px' }}>О себе</label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Расскажите о любимых жанрах..."
                className="us-pay-input"
              />

              <label className="us-pay-label" style={{ marginTop: '10px' }}>Тема баннера</label>
              <div className="us-dc-theme-grid">
                {Object.entries(BANNER_THEMES).map(([key, t]) => (
                  <button
                    key={key}
                    type="button"
                    className={`us-dc-theme-swatch ${bannerTheme === key && !customBanner ? 'active' : ''}`}
                    style={{ background: t.bg }}
                    onClick={() => {
                      setCustomBanner('');
                      setItem('us_profile_custom_banner', '');
                      setBannerTheme(key);
                    }}
                    title={t.label}
                  />
                ))}
              </div>

              <div className="us-dc-upload-row">
                <label className="us-btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                  Свой аватар
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'avatar')} />
                </label>
                <label className="us-btn-secondary" style={{ flex: 1, textAlign: 'center', cursor: 'pointer' }}>
                  Свой баннер
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'banner')} />
                </label>
              </div>

              <button type="button" className="btn-auth-launch" style={{ width: '100%', justifyContent: 'center', marginTop: '12px' }} onClick={handleSaveProfile}>
                Сохранить изменения
              </button>
            </div>
          ) : (
            <div className="us-dc-identity">
              <h1 className="us-dc-name">{displayName}</h1>
              <div className="us-dc-handle">@{user.username} • {STATUS_CONFIG[status]?.label}</div>

              {customActivity && (
                <div className="us-dc-activity">
                  <Icon name="gamepad" size={14} />
                  <span>{customActivity}</span>
                </div>
              )}

              <div className="us-dc-divider" />

              <div className="us-dc-block">
                <h4>О СЕБЕ</h4>
                <p>{bio || 'Участник игровой вселенной UnifiedStack. Нажмите «Редактировать профиль», чтобы добавить описание и сменить баннер.'}</p>
              </div>

              <div className="us-dc-block">
                <h4>ПОИНТЫ И НАГРАДЫ</h4>
                <div className="us-dc-points-box">
                  <div>
                    <span>Баланс поинтов</span>
                    <strong>{points.toLocaleString('ru-RU')} P</strong>
                  </div>
                  <button type="button" className="btn-auth-launch" onClick={() => setShowShop(true)}>
                    Магазин
                  </button>
                </div>
              </div>

              <div className="us-dc-block">
                <h4>ЗНАЧКИ ПРОФИЛЯ ({badges.length + unlockedAchievements.length})</h4>
                <div className="us-dc-badges-row">
                  {badges.map((b) => (
                    <span key={b.id} className="us-dc-badge-chip" title={`Значок: ${b.gameTitle} (Ур. ${b.level})`}>
                      ★ {b.gameTitle} · Lv.{b.level}
                    </span>
                  ))}
                  {unlockedAchievements.map((a) => (
                    <span key={a.id} className="us-dc-badge-chip" title={a.title}>
                      {a.title}
                    </span>
                  ))}
                  {badges.length === 0 && unlockedAchievements.length === 0 && (
                    <span style={{ fontSize: '12px', color: '#64748b' }}>Скрафтите значок из 5 карточек игры</span>
                  )}
                </div>
              </div>
            </div>
          )}
        </aside>

        {/* Правая рабочая область профиля */}
        <main className="us-dc-main">
          <div className="us-dc-tabs">
            <button type="button" className={`us-tab-pill ${activeTab === 'games' ? 'active' : ''}`} onClick={() => setActiveTab('games')}>
              Игры ({games.length})
            </button>
            <button type="button" className={`us-tab-pill ${activeTab === 'cards' ? 'active' : ''}`} onClick={() => setActiveTab('cards')}>
              Карточки и крафт ({cards.length})
            </button>
            <button type="button" className={`us-tab-pill ${activeTab === 'media' ? 'active' : ''}`} onClick={() => setActiveTab('media')}>
              Галерея ({screenshots.length})
            </button>
            <button type="button" className={`us-tab-pill ${activeTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveTab('notes')}>
              Заметки ({notes.length})
            </button>
          </div>

          {activeTab === 'games' && (
            <div className="us-dc-panel">
              <div className="us-dc-panel-head">
                <h2>Коллекция игр</h2>
                <Link href="/library" className="us-btn-secondary">Открыть лаунчер</Link>
              </div>
              {games.length === 0 ? (
                <EmptyState
                  title="Библиотека пока пуста"
                  desc="Купленные игры появятся в вашей витрине профиля."
                  linkText="Перейти в каталог"
                  linkHref="/store"
                />
              ) : (
                <div className="us-dc-games-list">
                  {games.map((g) => (
                    <Link key={g.id} href={`/store/${g.id}`} className="us-dc-game-row">
                      <img src={g.image} alt={g.title} />
                      <div className="us-dc-game-meta">
                        <h4>{g.title}</h4>
                        <span>{g.genre} • В библиотеке с {g.purchaseDate}</span>
                      </div>
                      <span className="us-tag us-tag-accent">В коллекции</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'cards' && (
            <div className="us-dc-panel">
              <div className="us-dc-panel-head">
                <div>
                  <h2>Коллекционные карточки</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#94a3b8' }}>
                    Соберите 5 карт одной игры, чтобы скрафтить значок (+250 P), или продайте лишние карты по 40 P.
                  </p>
                </div>
              </div>

              {craftable.length > 0 && (
                <div className="us-craft-banner">
                  <h3>Готово к крафту значка!</h3>
                  {craftable.map((g) => (
                    <div key={g.gameId} className="us-craft-row">
                      <span>{g.gameTitle} (5/5 уникальных карт)</span>
                      <button type="button" className="btn-auth-launch" onClick={() => handleCraft(g.gameId)}>
                        Скрафтить значок (+250 P)
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {cards.length === 0 ? (
                <EmptyState
                  title="Нет коллекционных карточек"
                  desc="При покупке любой игры вы получаете стартовый набор из 3 карточек."
                  linkText="Перейти в магазин"
                  linkHref="/store"
                />
              ) : (
                Object.entries(cardsByGame).map(([gameId, gameCards]) => {
                  const uniqueSet = new Set(gameCards.map((c) => c.index));
                  const gameCover = games.find((g) => String(g.id) === String(gameId))?.image || gameCards[0]?.image;
                  return (
                    <div key={gameId} className="us-card-set-block">
                      <div className="us-card-set-header">
                        <div>
                          <h4>{gameCards[0].gameTitle}</h4>
                          <span>Прогресс сета: {uniqueSet.size} из 5 уникальных карт</span>
                        </div>
                        <button
                          type="button"
                          className="us-btn-secondary"
                          onClick={() => handleBuyBooster(gameId, gameCards[0].gameTitle, gameCover)}
                        >
                          Бустер +2 карты (150 P)
                        </button>
                      </div>

                      <div className="us-cards-shelf">
                        {gameCards.map((c) => (
                          <SteamCardComp
                            key={c.id}
                            cardId={c.id}
                            gameTitle={c.gameTitle}
                            index={c.index}
                            image={gameCover}
                            onSell={handleSellCard}
                          />
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'media' && (
            <div className="us-dc-panel">
              <div className="us-dc-panel-head">
                <h2>Скриншоты и арты</h2>
                <label className="btn-auth-launch" style={{ cursor: 'pointer' }}>
                  + Загрузить скриншот
                  <input type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e, 'screenshot')} />
                </label>
              </div>
              {screenshots.length === 0 ? (
                <EmptyState title="Галерея пуста" desc="Загрузите лучшие моменты из ваших игр." />
              ) : (
                <div className="screenshots-grid">
                  {screenshots.map((img, i) => (
                    <div key={img.id || i} className="screenshot">
                      <img src={img.src} alt="Скриншот" />
                      <button
                        type="button"
                        className="profile-remove-btn"
                        onClick={() => {
                          const next = screenshots.filter((_, idx) => idx !== i);
                          setScreenshots(next);
                          setJSON('user_screenshots', next);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="us-dc-panel">
              <h2>Игровые заметки и гайды</h2>
              <div className="us-note-form">
                <input
                  type="text"
                  placeholder="Заголовок заметки или руководства"
                  value={noteForm.title}
                  onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
                  className="us-pay-input"
                />
                <textarea
                  rows={3}
                  placeholder="Поделитесь сборкой, тактикой или впечатлениями..."
                  value={noteForm.text}
                  onChange={(e) => setNoteForm({ ...noteForm, text: e.target.value })}
                  className="us-pay-input"
                />
                <button type="button" className="btn-auth-launch" style={{ alignSelf: 'flex-start' }} onClick={handleAddNote}>
                  Опубликовать
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '18px' }}>
                {notes.map((n, i) => (
                  <div key={i} className="us-dc-note-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <h4>{n.title}</h4>
                      <button
                        type="button"
                        className="us-btn-secondary"
                        onClick={() => {
                          const next = notes.filter((_, idx) => idx !== i);
                          setNotes(next);
                          setJSON('user_guides', next);
                        }}
                      >
                        Удалить
                      </button>
                    </div>
                    <p>{n.text || n.desc}</p>
                    <span>{n.date}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
