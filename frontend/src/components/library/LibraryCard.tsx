'use client';

import { useState } from 'react';
import { showToast } from '@/lib/toast';
import Icon from '@/components/ui/Icon';

export default function LibraryCard({ game, onRemove }: any) {
  const [installed, setInstalled] = useState(
    typeof window !== 'undefined' ? localStorage.getItem(`game_installed_${game.id}`) === 'true' : false
  );
  const [loading, setLoading] = useState(false);

  const initialCover = game.image || '/img/game-placeholder.svg';
  const [coverSrc, setCoverSrc] = useState(initialCover);

  const handleInstall = () => {
    if (installed) return;
    setLoading(true);

    setTimeout(() => {
      const safeName = game.title.replace(/[^a-zA-Z0-9а-яА-Я_-]/g, '_');
      const torrentContent = `d8:announce26:http://unifiedstack.local/announce4:infod6:length0e4:name${game.title.length}:${game.title}12:piece lengthi16384e6:pieces0:ee`;
      const blob = new Blob([torrentContent], { type: 'application/x-bittorrent' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeName}.torrent`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setInstalled(true);
      setLoading(false);
      localStorage.setItem(`game_installed_${game.id}`, 'true');

      if (typeof showToast === 'function') {
        showToast(`Торрент-файл "${game.title}" загружен`);
      }
    }, 1200);
  };

  const handleRemove = () => {
    if (confirm(`Удалить "${game.title}" из библиотеки?`)) {
      onRemove(game.id);
    }
  };

  return (
    <div className={`library-card ${installed ? 'game-card-installed' : ''}`}>
      <div className="library-card-image-wrap">
        <img
          src={coverSrc}
          alt={game.title}
          onError={() => setCoverSrc('/img/game-placeholder.svg')}
        />
        <span className="library-status-badge">{installed ? 'Установлено' : 'В библиотеке'}</span>
      </div>

      <div className="library-card-body">
        <h4>{game.title}</h4>
        <div className="library-card-info">
          <p>
            <span>Добавлена:</span> <strong>{game.purchaseDate || 'Недавно'}</strong>
          </p>
        </div>

        <div className="library-card-buttons">
          <button
            type="button"
            className={`library-install-btn ${installed ? 'installed' : ''}`}
            onClick={handleInstall}
            disabled={installed || loading}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
          >
            <Icon name={installed ? 'gamepad' : 'cloud'} size={16} />
            <span>{loading ? 'Подготовка...' : installed ? 'Готово к запуску' : 'Скачать'}</span>
          </button>

          <button
            type="button"
            className="library-remove-btn"
            onClick={handleRemove}
            title="Удалить из библиотеки"
          >
            Удалить
          </button>
        </div>
      </div>
    </div>
  );
}
