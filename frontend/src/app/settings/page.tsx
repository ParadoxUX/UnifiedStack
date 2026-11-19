'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getCurrentUser, User } from '@/lib/auth';
import { getItem, setItem } from '@/lib/storage';
import { showToast } from '@/lib/toast';
import { useLang } from '@/lib/i18n';

const TABS = [
  { id: 'appearance', label: 'Внешний вид и 3D', sub: 'Темы, интро, язык' },
  { id: 'account', label: 'Аккаунт и статус', sub: 'Профиль, онлайн-статус' },
  { id: 'privacy', label: 'Приватность', sub: 'Видимость библиотеки' },
  { id: 'notifications', label: 'Уведомления', sub: 'Скидки, чат, релизы' },
  { id: 'security', label: 'Безопасность', sub: 'Сессия и кэш' },
];

const THEMES = [
  { id: 'default', name: 'Obsidian Neon', desc: 'Глубокий тёмный + фиолетовый неон', swatch: 'linear-gradient(135deg,#07060e 35%,#8b5cf6 70%,#d946ef 100%)' },
  { id: 'crimson', name: 'Crimson Cyber', desc: 'Тёмный графит + алый акцент', swatch: 'linear-gradient(135deg,#0c070a 35%,#ef4444 72%,#f97316 100%)' },
  { id: 'noir', name: 'Ghost Noir', desc: 'Кинематографичный монохром + красный', swatch: 'linear-gradient(135deg,#09090b 40%,#dc2626 85%,#f4f4f5 100%)' },
  { id: 'frost', name: 'Northern Frost', desc: 'Холодный сланец + ледяной голубой', swatch: 'linear-gradient(135deg,#090d14 35%,#38bdf8 75%,#cbd5e1 100%)' },
  { id: 'light', name: 'Light Studio', desc: 'Светлая контрастная тема', swatch: 'linear-gradient(135deg,#f8fafc 45%,#8b5cf6 100%)' },
];

const STATUSES = [
  { id: 'online', label: 'В сети', color: '#22c55e' },
  { id: 'away', label: 'Отошёл', color: '#f59e0b' },
  { id: 'dnd', label: 'Не беспокоить', color: '#ef4444' },
  { id: 'invisible', label: 'Невидимка', color: '#64748b' },
];

const THEME_CLASSES = ['theme-light', 'theme-blue', 'theme-maroon', 'theme-glass', 'theme-dark', 'theme-crimson', 'theme-noir', 'theme-frost'];

export default function SettingsPage() {
  const { lang, setLang } = useLang();
  const [activeTab, setActiveTab] = useState('appearance');
  const [user, setUser] = useState<User | null>(null);
  const [theme, setTheme] = useState('default');
  const [status, setStatus] = useState('online');

  const [privacy, setPrivacy] = useState({ showStatus: true, showLibrary: true, allowFriends: true });
  const [notifications, setNotifications] = useState({ messages: true, sales: true, newGames: true });
  const [twoFactor, setTwoFactor] = useState(false);

  useEffect(() => {
    setUser(getCurrentUser());
    setTheme(getItem('app_theme') || 'default');
    setStatus(getItem('user_status') || 'online');
    try {
      const p = getItem('user_settings_privacy');
      if (p) setPrivacy(JSON.parse(p));
      const n = getItem('user_settings_notifications');
      if (n) setNotifications(JSON.parse(n));
      const s = getItem('user_settings_security');
      if (s) setTwoFactor(Boolean(JSON.parse(s).twoFactor));
    } catch {}
  }, []);

  const applyTheme = (nextTheme: string) => {
    THEME_CLASSES.forEach((c) => document.body.classList.remove(c));
    if (nextTheme !== 'default') document.body.classList.add(`theme-${nextTheme}`);
    setItem('app_theme', nextTheme);
    setTheme(nextTheme);
    showToast('Тема оформления применена', 'success');
  };

  const applyStatus = (nextStatus: string) => {
    setItem('user_status', nextStatus);
    setStatus(nextStatus);
    window.dispatchEvent(new Event('us:auth-changed'));
    showToast('Онлайн-статус обновлён', 'success');
  };

  const savePrivacy = (next: typeof privacy) => {
    setPrivacy(next);
    setItem('user_settings_privacy', JSON.stringify(next));
    showToast('Приватность сохранена', 'success');
  };

  const saveNotifications = (next: typeof notifications) => {
    setNotifications(next);
    setItem('user_settings_notifications', JSON.stringify(next));
    showToast('Уведомления обновлены', 'success');
  };

  const replay3DIntro = () => {
    window.dispatchEvent(new Event('us:replay-intro'));
  };

  return (
    <div className="pv-settings-page">
      <div className="pv-settings-head">
        <div>
          <span className="pv-rev-kicker">КОНФИГУРАЦИЯ ПЛАТФОРМЫ</span>
          <h1>Настройки</h1>
        </div>
        <button type="button" className="pv-btn-glass" onClick={replay3DIntro}>
          Запустить 3D-анимацию загрузки
        </button>
      </div>

      <div className="pv-settings-layout">
        <aside className="pv-settings-nav">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`pv-set-tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <strong>{tab.label}</strong>
              <span>{tab.sub}</span>
            </button>
          ))}
        </aside>

        <section className="pv-settings-panel">
          {activeTab === 'appearance' && (
            <div className="pv-set-section">
              <h2>Тема оформления</h2>
              <p className="pv-set-muted">Меняет акцентное свечение и палитру интерфейса мгновенно.</p>
              <div className="pv-theme-grid">
                {THEMES.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`pv-theme-card ${theme === t.id ? 'is-active' : ''}`}
                    onClick={() => applyTheme(t.id)}
                  >
                    <span className="pv-theme-swatch" style={{ background: t.swatch }} />
                    <strong>{t.name}</strong>
                    <small>{t.desc}</small>
                  </button>
                ))}
              </div>

              <div className="pv-set-divider" />

              <h2>Язык интерфейса</h2>
              <div className="pv-lang-row">
                {(['ru', 'en'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    className={`pv-sort-btn ${lang === code ? 'is-active' : ''}`}
                    onClick={() => { setLang(code); showToast('Язык изменён', 'success'); }}
                  >
                    {code === 'ru' ? 'Русский (RU)' : 'English (EN)'}
                  </button>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'account' && (
            <div className="pv-set-section">
              <h2>Аккаунт UnifiedStack</h2>
              <div className="pv-account-grid">
                <div className="pv-info-tile">
                  <span>Никнейм</span>
                  <strong>{user?.username || 'Гость (не выполнен вход)'}</strong>
                </div>
                <div className="pv-info-tile">
                  <span>Email</span>
                  <strong>{user?.email || '—'}</strong>
                </div>
                <div className="pv-info-tile">
                  <span>ID аккаунта</span>
                  <strong>{user?.id || '—'}</strong>
                </div>
                <div className="pv-info-tile">
                  <span>Регистрация</span>
                  <strong>{user?.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '—'}</strong>
                </div>
              </div>

              <div className="pv-set-divider" />
              <h2>Онлайн-статус</h2>
              <div className="pv-status-row">
                {STATUSES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`pv-status-chip ${status === s.id ? 'is-active' : ''}`}
                    onClick={() => applyStatus(s.id)}
                  >
                    <i style={{ background: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>

              <div style={{ marginTop: 20 }}>
                <Link href="/profile" className="pv-btn-primary">
                  Открыть профиль и косметику
                </Link>
              </div>
            </div>
          )}

          {activeTab === 'privacy' && (
            <div className="pv-set-section">
              <h2>Приватность профиля</h2>
              <div className="pv-switch-list">
                <label className="pv-switch-row">
                  <div>
                    <strong>Показывать онлайн-статус</strong>
                    <span>Друзья увидят, когда вы в сети или в игре</span>
                  </div>
                  <input type="checkbox" checked={privacy.showStatus} onChange={(e) => savePrivacy({ ...privacy, showStatus: e.target.checked })} />
                  <span className="pv-switch-ui" />
                </label>

                <label className="pv-switch-row">
                  <div>
                    <strong>Открытая библиотека игр</strong>
                    <span>Разрешить просмотр купленных игр и достижений</span>
                  </div>
                  <input type="checkbox" checked={privacy.showLibrary} onChange={(e) => savePrivacy({ ...privacy, showLibrary: e.target.checked })} />
                  <span className="pv-switch-ui" />
                </label>

                <label className="pv-switch-row">
                  <div>
                    <strong>Заявки в друзья</strong>
                    <span>Другие игроки смогут отправлять приглашения</span>
                  </div>
                  <input type="checkbox" checked={privacy.allowFriends} onChange={(e) => savePrivacy({ ...privacy, allowFriends: e.target.checked })} />
                  <span className="pv-switch-ui" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="pv-set-section">
              <h2>Уведомления</h2>
              <div className="pv-switch-list">
                <label className="pv-switch-row">
                  <div>
                    <strong>Сообщения и друзья</strong>
                    <span>Оповещения о новых сообщениях в чате</span>
                  </div>
                  <input type="checkbox" checked={notifications.messages} onChange={(e) => saveNotifications({ ...notifications, messages: e.target.checked })} />
                  <span className="pv-switch-ui" />
                </label>

                <label className="pv-switch-row">
                  <div>
                    <strong>Скидки на игры из желаемого</strong>
                    <span>Сигнализировать при падении цены в каталоге</span>
                  </div>
                  <input type="checkbox" checked={notifications.sales} onChange={(e) => saveNotifications({ ...notifications, sales: e.target.checked })} />
                  <span className="pv-switch-ui" />
                </label>

                <label className="pv-switch-row">
                  <div>
                    <strong>Новые релизы и DLC</strong>
                    <span>Анонсы крупных обновлений и дополнений</span>
                  </div>
                  <input type="checkbox" checked={notifications.newGames} onChange={(e) => saveNotifications({ ...notifications, newGames: e.target.checked })} />
                  <span className="pv-switch-ui" />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="pv-set-section">
              <h2>Безопасность и сессия</h2>
              <div className="pv-switch-list">
                <label className="pv-switch-row">
                  <div>
                    <strong>Двухфакторная защита (2FA)</strong>
                    <span>Дополнительное подтверждение при входе</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={twoFactor}
                    onChange={(e) => {
                      setTwoFactor(e.target.checked);
                      setItem('user_settings_security', JSON.stringify({ twoFactor: e.target.checked }));
                      showToast('Настройка безопасности сохранена', 'success');
                    }}
                  />
                  <span className="pv-switch-ui" />
                </label>
              </div>

              <div className="pv-set-divider" />
              <div className="pv-info-tile">
                <span>Защита токена</span>
                <strong>HttpOnly + SameSite=Strict Cookie (активно)</strong>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
