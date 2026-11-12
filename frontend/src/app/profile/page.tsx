'use client';
import { useState, useEffect } from 'react';
import { getJSON, getItem, setItem } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { ACHIEVEMENTS_DEFINITIONS } from '@/data/achievements';
import PointsShop from '@/components/shop/PointsShop';
import { showToast } from '@/lib/toast';

const TABS = [
  { id: 'games', label: 'Игры' },
  { id: 'inventory', label: 'Инвентарь' },
  { id: 'screenshots', label: 'Скриншоты' },
  { id: 'videos', label: 'Видео' },
  { id: 'workshop', label: 'Мастерская' },
  { id: 'reviews', label: 'Обзоры' },
  { id: 'guides', label: 'Руководство' },
  { id: 'illustrations', label: 'Иллюстрации' },
];

const STATUS_LABELS: Record<string, string> = {
  online: 'В сети',
  away: 'Отошёл',
  dnd: 'Не беспокоить',
  invisible: 'Невидимка'
};

const STATUS_COLORS: Record<string, string> = {
  online: '#4caf50',
  away: '#ffaa00',
  dnd: '#ff4444',
  invisible: '#888'
};

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('games');
  const [showShop, setShowShop] = useState(false);

  const [bio, setBio] = useState('');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [status, setStatus] = useState('online');
  const [showStatusMenu, setShowStatusMenu] = useState(false);

  const [games, setGames] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [screenshots, setScreenshots] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [workshop, setWorkshop] = useState<any[]>([]);
  const [reviews, setReviews] = useState<any[]>([]);
  const [guides, setGuides] = useState<any[]>([]);
  const [illustrations, setIllustrations] = useState<any[]>([]);
  const [unlockedAch, setUnlockedAch] = useState<string[]>([]);
  const [points, setPoints] = useState(0);

  const [newItemName, setNewItemName] = useState('');
  const [videoForm, setVideoForm] = useState({ title: '', url: '' });
  const [workshopForm, setWorkshopForm] = useState({ title: '', url: '', desc: '' });
  const [guideForm, setGuideForm] = useState({ title: '', url: '', desc: '' });

  const loadData = () => {
    const rawGames = getJSON<any[]>('user_game_library', []);
    const uniqueGames = rawGames.filter((g, i, arr) => g && g.id && arr.findIndex(x => x && x.id === g.id) === i);
    setGames(uniqueGames);

    setInventory(getJSON('user_inventory', []));
    setScreenshots(getJSON('user_screenshots', []));
    setVideos(getJSON('user_videos', []));
    setWorkshop(getJSON('user_workshop', []));
    setReviews(getJSON('user_reviews', []));
    setGuides(getJSON('user_guides', []));
    setIllustrations(getJSON('user_illustrations', []));
    setUnlockedAch(getJSON('user_achievements', []));
    setBio(getItem('user_bio') || '');
    setStatus(getItem('user_status') || 'online');
    setPoints(parseInt(getItem('user_points') || '0', 10) || 0);
  };

  useEffect(() => {
    setMounted(true);
    setUser(getCurrentUser());
    loadData();
  }, []);

  const handleAddItem = () => {
    if (!newItemName.trim()) return;
    const updated = [...inventory, { name: newItemName.trim() }];
    setInventory(updated);
    setItem('user_inventory', JSON.stringify(updated));
    setNewItemName('');
    showToast('Предмет добавлен', 'success');
  };

  const handleRemoveItem = (idx: number) => {
    const updated = inventory.filter((_, i) => i !== idx);
    setInventory(updated);
    setItem('user_inventory', JSON.stringify(updated));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, type: 'screenshots' | 'illustrations') => {
    const files = e.target.files;
    if (!files) return;
    Array.from(files).forEach((file: any) => {
      if (file.size > 2000000) {
        showToast('Файл слишком большой (макс 2MB)', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const base64 = ev.target?.result as string;
        const current = getJSON<any[]>('user_' + type, []);
        current.push({ id: Date.now() + Math.random(), src: base64, date: new Date().toLocaleDateString('ru-RU') });
        setItem('user_' + type, JSON.stringify(current));
        if (type === 'screenshots') setScreenshots(current); else setIllustrations(current);
        showToast('Изображение загружено', 'success');
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveMedia = (idx: number, type: 'screenshots' | 'illustrations') => {
    const current = type === 'screenshots' ? screenshots : illustrations;
    const updated = current.filter((_, i) => i !== idx);
    setItem('user_' + type, JSON.stringify(updated));
    if (type === 'screenshots') setScreenshots(updated); else setIllustrations(updated);
  };

  const handleAddVideo = () => {
    if (!videoForm.title.trim() || !videoForm.url.trim()) return;
    const updated = [...videos, { title: videoForm.title.trim(), url: videoForm.url.trim(), date: new Date().toLocaleDateString('ru-RU') }];
    setVideos(updated);
    setItem('user_videos', JSON.stringify(updated));
    setVideoForm({ title: '', url: '' });
    showToast('Видео добавлено', 'success');
  };

  const handleRemoveVideo = (idx: number) => {
    const updated = videos.filter((_, i) => i !== idx);
    setVideos(updated);
    setItem('user_videos', JSON.stringify(updated));
  };

  const handleAddWorkshop = () => {
    if (!workshopForm.title.trim()) return;
    const updated = [...workshop, { ...workshopForm, date: new Date().toLocaleDateString('ru-RU') }];
    setWorkshop(updated);
    setItem('user_workshop', JSON.stringify(updated));
    setWorkshopForm({ title: '', url: '', desc: '' });
    showToast('Работа добавлена', 'success');
  };

  const handleRemoveWorkshop = (idx: number) => {
    const updated = workshop.filter((_, i) => i !== idx);
    setWorkshop(updated);
    setItem('user_workshop', JSON.stringify(updated));
  };

  const handleAddGuide = () => {
    if (!guideForm.title.trim()) return;
    const updated = [...guides, { ...guideForm, date: new Date().toLocaleDateString('ru-RU') }];
    setGuides(updated);
    setItem('user_guides', JSON.stringify(updated));
    setGuideForm({ title: '', url: '', desc: '' });
    showToast('Руководство добавлено', 'success');
  };

  const handleRemoveGuide = (idx: number) => {
    const updated = guides.filter((_, i) => i !== idx);
    setGuides(updated);
    setItem('user_guides', JSON.stringify(updated));
  };

  const handleSaveBio = () => {
    setItem('user_bio', bio);
    setIsEditingBio(false);
    showToast('Описание сохранено', 'success');
  };

  const handleStatusChange = (newStatus: string) => {
    setItem('user_status', newStatus);
    setStatus(newStatus);
    setShowStatusMenu(false);
    showToast(`Статус изменен: ${STATUS_LABELS[newStatus]}`, 'success');
  };

  if (!mounted || !user) return <div className="profile-loading">Загрузка...</div>;

  const unlockedAchievements = ACHIEVEMENTS_DEFINITIONS.filter(a => unlockedAch.includes(a.id));

  return (
    <div className="profile-page">
      {showShop && <PointsShop onClose={() => { setShowShop(false); loadData(); }} />}

      <div className="profile-container">

        {/* Левая колонка */}
        <div className="profile-left">
          <div className="profile-avatar">
            <img src={user.avatar || '/img/default-avatar.svg'} alt="Avatar" />
            <span className="profile-status-dot" style={{ background: STATUS_COLORS[status] }}></span>
          </div>
          <h2 className="profile-nickname">{user.username}</h2>

          {/* Статус */}
          <div className="profile-status-wrapper">
            <button
              className="profile-status-btn"
              onClick={() => setShowStatusMenu(!showStatusMenu)}
            >
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: STATUS_COLORS[status] }}></span>
              {STATUS_LABELS[status]}
            </button>

            {showStatusMenu && (
              <div className="profile-status-menu">
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <button key={key} onClick={() => handleStatusChange(key)}>
                    {label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Био */}
          <div className="profile-bio">
            {isEditingBio ? (
              <div>
                <textarea
                  value={bio}
                  onChange={e => setBio(e.target.value)}
                  placeholder="Расскажите о себе..."
                  className="profile-bio-input"
                />
                <button onClick={handleSaveBio} className="profile-bio-save">Сохранить</button>
              </div>
            ) : (
              <div>
                <p className="profile-bio-text">{bio || 'Описание отсутствует'}</p>
                <button onClick={() => setIsEditingBio(true)} className="profile-bio-edit">Редактировать</button>
              </div>
            )}
          </div>

          {/* Значки */}
          <div className="profile-badges">
            <h3>Значки <span className="badges-count">{unlockedAch.length}</span></h3>
            <div className="badges-list">
              {unlockedAchievements.length === 0 ? (
                <span className="profile-empty-note">Пока нет достижений</span>
              ) : (
                unlockedAchievements.map(ach => (
                  <div
                    key={ach.id}
                    title={ach.title}
                    className="badge"
                    dangerouslySetInnerHTML={{ __html: ach.svg.replace('width="22" height="22"', 'width="18" height="18"') }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Очки */}
          <div className="profile-points">
            <div className="profile-points-icon">P</div>
            <div className="profile-points-info">
              <div className="profile-points-label">Очки</div>
              <div className="profile-points-value">{points.toLocaleString('ru-RU')}</div>
            </div>
            <button onClick={() => setShowShop(true)} className="profile-points-btn">Магазин</button>
          </div>

          {/* Меню */}
          <div className="profile-menu">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`profile-menu-btn ${activeTab === tab.id ? 'active' : ''}`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Правая колонка */}
        <div className="profile-right">
          <h2 className="profile-section-title">
            {TABS.find(t => t.id === activeTab)?.label || 'Раздел'}
          </h2>

          {activeTab === 'games' && (
            <div className="profile-tab-content active">
              {games.length === 0 ? (
                <p className="profile-empty-note">Игр пока нет</p>
              ) : (
                games.map(g => (
                  <div key={g.id} className="game-item">
                    <div className="game-cover-small">
                      <img src={g.image || '/img/default-avatar.svg'} alt={g.title} />
                    </div>
                    <div className="game-info">
                      <h4>{g.title}</h4>
                      <p className="game-last-played">В библиотеке с {g.purchaseDate || 'недавнего времени'}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'inventory' && (
            <div className="profile-tab-content active">
              <div className="profile-form-row">
                <input
                  type="text"
                  value={newItemName}
                  onChange={e => setNewItemName(e.target.value)}
                  placeholder="Название предмета"
                  className="profile-form-input"
                />
                <button onClick={handleAddItem} className="profile-form-submit">Добавить</button>
              </div>
              <div className="inventory-grid">
                {inventory.map((item, i) => (
                  <div key={i} className="inventory-item">
                    {item.name}
                    <button onClick={() => handleRemoveItem(i)} className="profile-remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'screenshots' && (
            <div className="profile-tab-content active">
              <div className="profile-upload-row">
                <label className="profile-upload-btn">
                  Загрузить скриншоты
                  <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'screenshots')} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="screenshots-grid">
                {screenshots.map((img, i) => (
                  <div key={i} className="screenshot">
                    <img src={img.src} alt="Скриншот" />
                    <button onClick={() => handleRemoveMedia(i, 'screenshots')} className="profile-remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'videos' && (
            <div className="profile-tab-content active">
              <div className="profile-form-stack">
                <input type="text" value={videoForm.title} onChange={e => setVideoForm({ ...videoForm, title: e.target.value })} placeholder="Название видео" className="profile-form-input" />
                <input type="text" value={videoForm.url} onChange={e => setVideoForm({ ...videoForm, url: e.target.value })} placeholder="YouTube URL" className="profile-form-input" />
                <button onClick={handleAddVideo} className="profile-form-submit">Добавить</button>
              </div>
              <div className="profile-media-list">
                {videos.map((v, i) => (
                  <div key={i} className="profile-media-item">
                    <div>
                      <h4>{v.title}</h4>
                      <a href={v.url} target="_blank" rel="noreferrer" className="profile-media-link">{v.url}</a>
                    </div>
                    <button onClick={() => handleRemoveVideo(i)} className="profile-remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workshop' && (
            <div className="profile-tab-content active">
              <div className="profile-form-stack">
                <input type="text" value={workshopForm.title} onChange={e => setWorkshopForm({ ...workshopForm, title: e.target.value })} placeholder="Название работы" className="profile-form-input" />
                <input type="text" value={workshopForm.url} onChange={e => setWorkshopForm({ ...workshopForm, url: e.target.value })} placeholder="Ссылка на Steam Workshop" className="profile-form-input" />
                <textarea value={workshopForm.desc} onChange={e => setWorkshopForm({ ...workshopForm, desc: e.target.value })} placeholder="Описание" className="profile-form-input" />
                <button onClick={handleAddWorkshop} className="profile-form-submit">Добавить</button>
              </div>
              <div className="profile-media-list">
                {workshop.map((w, i) => (
                  <div key={i} className="profile-media-item">
                    <div>
                      <h4>{w.title}</h4>
                      <a href={w.url} target="_blank" rel="noreferrer" className="profile-media-link">{w.url}</a>
                      <p className="profile-media-desc">{w.desc}</p>
                    </div>
                    <button onClick={() => handleRemoveWorkshop(i)} className="profile-remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="profile-tab-content active">
              {reviews.length === 0 ? (
                <p className="profile-empty-note">Обзоров пока нет</p>
              ) : (
                <div className="profile-media-list">
                  {reviews.map((r, i) => (
                    <div key={i} className="profile-media-item">
                      <div>
                        <h4>{r.gameTitle}</h4>
                        <p className="profile-media-desc">{r.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'guides' && (
            <div className="profile-tab-content active">
              <div className="profile-form-stack">
                <input type="text" value={guideForm.title} onChange={e => setGuideForm({ ...guideForm, title: e.target.value })} placeholder="Название руководства" className="profile-form-input" />
                <input type="text" value={guideForm.url} onChange={e => setGuideForm({ ...guideForm, url: e.target.value })} placeholder="Ссылка" className="profile-form-input" />
                <textarea value={guideForm.desc} onChange={e => setGuideForm({ ...guideForm, desc: e.target.value })} placeholder="Краткое содержание" className="profile-form-input" />
                <button onClick={handleAddGuide} className="profile-form-submit">Добавить</button>
              </div>
              <div className="profile-media-list">
                {guides.map((g, i) => (
                  <div key={i} className="profile-media-item">
                    <div>
                      <h4>{g.title}</h4>
                      <a href={g.url} target="_blank" rel="noreferrer" className="profile-media-link">{g.url}</a>
                      <p className="profile-media-desc">{g.desc}</p>
                    </div>
                    <button onClick={() => handleRemoveGuide(i)} className="profile-remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'illustrations' && (
            <div className="profile-tab-content active">
              <div className="profile-upload-row">
                <label className="profile-upload-btn">
                  Загрузить иллюстрации
                  <input type="file" accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'illustrations')} style={{ display: 'none' }} />
                </label>
              </div>
              <div className="screenshots-grid">
                {illustrations.map((img, i) => (
                  <div key={i} className="screenshot">
                    <img src={img.src} alt="Иллюстрация" />
                    <button onClick={() => handleRemoveMedia(i, 'illustrations')} className="profile-remove-btn">×</button>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
