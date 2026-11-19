'use client';

import { useState, useEffect, useMemo } from 'react';
import { getJSON, setJSON } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { showToast } from '@/lib/toast';

interface ReviewItem {
  id: string;
  gameId: string;
  gameTitle: string;
  author: string;
  rating: number;
  recommended: boolean;
  hours: number;
  text: string;
  date: string;
  helpful: number;
}

function buildSeedReviews(gameId: string, gameTitle: string): ReviewItem[] {
  return [
    {
      id: `seed-${gameId}-1`,
      gameId,
      gameTitle,
      author: 'Kaelen_V',
      rating: 5,
      recommended: true,
      hours: 64,
      text: `${gameTitle} цепляет с первых минут: атмосфера, визуал и саундтрек на высшем уровне. За всё прохождение ни разу не захотелось закрыть игру.`,
      date: '14.11.2026',
      helpful: 19,
    },
    {
      id: `seed-${gameId}-2`,
      gameId,
      gameTitle,
      author: 'NoraShift',
      rating: 4,
      recommended: true,
      hours: 28,
      text: 'Очень крепкий геймплей и отличная оптимизация на средних настройках. Сюжетные повороты держат до финала, своих денег точно стоит.',
      date: '09.11.2026',
      helpful: 11,
    },
  ];
}

export default function ProductReviews({ gameId, gameTitle }: { gameId: string; gameTitle: string }) {
  const [userReviews, setUserReviews] = useState<ReviewItem[]>([]);
  const [likedIds, setLikedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState<'all' | 'pos' | 'neg'>('all');
  const [newReview, setNewReview] = useState('');
  const [rating, setRating] = useState(5);
  const [recommended, setRecommended] = useState(true);

  useEffect(() => {
    const all = getJSON<ReviewItem[]>('user_reviews', []);
    setUserReviews(all.filter((r) => r.gameId === gameId));
    setLikedIds(getJSON<string[]>('user_review_likes', []));
  }, [gameId]);

  const allReviews = useMemo(() => {
    const seeded = buildSeedReviews(gameId, gameTitle);
    const normalizedUser = userReviews.map((r, i) => ({
      ...r,
      id: r.id || `user-${gameId}-${i}`,
      author: r.author || 'Игрок UnifiedStack',
      recommended: r.recommended ?? r.rating >= 4,
      hours: r.hours ?? 12,
      helpful: r.helpful ?? 0,
    }));
    return [...normalizedUser, ...seeded];
  }, [userReviews, gameId, gameTitle]);

  const filtered = useMemo(() => {
    if (filter === 'pos') return allReviews.filter((r) => r.recommended);
    if (filter === 'neg') return allReviews.filter((r) => !r.recommended);
    return allReviews;
  }, [allReviews, filter]);

  const stats = useMemo(() => {
    const total = allReviews.length;
    const avg = total
      ? allReviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / total
      : 5;
    const pos = allReviews.filter((r) => r.recommended).length;
    const posPct = total ? Math.round((pos / total) * 100) : 100;
    const dist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: allReviews.filter((r) => Math.round(r.rating) === star).length,
    }));
    return { total, avg: avg.toFixed(1), posPct, dist };
  }, [allReviews]);

  const handleAdd = () => {
    const clean = newReview.trim();
    if (clean.length < 5) {
      showToast('Напишите хотя бы пару слов в отзыве', 'error');
      return;
    }
    const current = getCurrentUser();
    const item: ReviewItem = {
      id: `rev_${Date.now()}`,
      gameId,
      gameTitle,
      author: current?.username || 'Гость UnifiedStack',
      rating,
      recommended,
      hours: Math.floor(Math.random() * 25) + 4,
      text: clean,
      date: new Date().toLocaleDateString('ru-RU'),
      helpful: 0,
    };

    const stored = getJSON<ReviewItem[]>('user_reviews', []);
    const nextAll = [item, ...stored];
    setJSON('user_reviews', nextAll);
    setUserReviews(nextAll.filter((r) => r.gameId === gameId));
    setNewReview('');
    showToast('Ваш отзыв опубликован', 'success');
  };

  const toggleHelpful = (id: string) => {
    const exists = likedIds.includes(id);
    const next = exists ? likedIds.filter((x) => x !== id) : [...likedIds, id];
    setLikedIds(next);
    setJSON('user_review_likes', next);
  };

  return (
    <section className="pv-reviews-section">
      <div className="pv-reviews-head">
        <div>
          <span className="pv-rev-kicker">МНЕНИЕ ИГРОКОВ</span>
          <h2>Отзывы о {gameTitle}</h2>
        </div>

        <div className="pv-rev-filters">
          {(
            [
              ['all', `Все (${allReviews.length})`],
              ['pos', 'Рекомендуют'],
              ['neg', 'Критика'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`pv-sort-btn ${filter === id ? 'is-active' : ''}`}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Сводка оценки + шкалы */}
      <div className="pv-rev-summary">
        <div className="pv-rev-score-box">
          <div className="pv-rev-score-num">{stats.avg}</div>
          <div className="pv-rev-stars">{'★'.repeat(Math.round(Number(stats.avg)))}{'☆'.repeat(5 - Math.round(Number(stats.avg)))}</div>
          <div className="pv-rev-verdict">
            {stats.posPct >= 80 ? 'Очень положительные' : stats.posPct >= 60 ? 'В основном положительные' : 'Смешанные'} ({stats.posPct}%)
          </div>
        </div>

        <div className="pv-rev-bars">
          {stats.dist.map((row) => {
            const pct = stats.total ? Math.round((row.count / stats.total) * 100) : 0;
            return (
              <div key={row.star} className="pv-rev-bar-row">
                <span>{row.star} ★</span>
                <div className="pv-rev-bar-track">
                  <div className="pv-rev-bar-fill" style={{ width: `${pct}%` }} />
                </div>
                <span className="pv-rev-bar-cnt">{row.count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Форма публикации */}
      <div className="pv-rev-composer">
        <div className="pv-rev-composer-top">
          <h3>Оставить свой отзыв</h3>
          <div className="pv-rev-rec-group">
            <button
              type="button"
              className={`pv-rec-pill ${recommended ? 'is-pos' : ''}`}
              onClick={() => { setRecommended(true); if (rating < 4) setRating(5); }}
            >
              Рекомендую
            </button>
            <button
              type="button"
              className={`pv-rec-pill ${!recommended ? 'is-neg' : ''}`}
              onClick={() => { setRecommended(false); if (rating > 3) setRating(2); }}
            >
              Не рекомендую
            </button>
          </div>
        </div>

        <div className="pv-rev-star-picker" aria-label="Оценка от 1 до 5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              className={star <= rating ? 'is-on' : ''}
              onClick={() => {
                setRating(star);
                setRecommended(star >= 4);
              }}
            >
              ★
            </button>
          ))}
          <span>{rating} / 5</span>
        </div>

        <textarea
          value={newReview}
          onChange={(e) => setNewReview(e.target.value)}
          placeholder="Расскажите о геймплее, графике, сюжете или оптимизации..."
          rows={3}
        />

        <div className="pv-rev-composer-foot">
          <span>Отзыв сохранится и сразу появится в ленте</span>
          <button type="button" className="pv-btn-primary" onClick={handleAdd}>
            Опубликовать отзыв
          </button>
        </div>
      </div>

      {/* Список карточек отзывов */}
      <div className="pv-rev-list">
        {filtered.length === 0 ? (
          <div className="pv-rev-empty">В этой категории пока нет отзывов — станьте первым.</div>
        ) : (
          filtered.map((r) => {
            const isLiked = likedIds.includes(r.id);
            const count = r.helpful + (isLiked ? 1 : 0);
            return (
              <article key={r.id} className="pv-rev-card">
                <div className="pv-rev-card-head">
                  <div className="pv-rev-author">
                    <span className="pv-rev-avatar">{r.author.slice(0, 1).toUpperCase()}</span>
                    <div>
                      <strong>{r.author}</strong>
                      <span>{r.hours} ч. в игре • {r.date}</span>
                    </div>
                  </div>
                  <div className="pv-rev-badges">
                    <span className={`pv-rev-tag ${r.recommended ? 'is-pos' : 'is-neg'}`}>
                      {r.recommended ? 'Рекомендует' : 'Не рекомендует'}
                    </span>
                    <span className="pv-rev-card-stars">{'★'.repeat(r.rating)}</span>
                  </div>
                </div>
                <p className="pv-rev-text">{r.text}</p>
                <div className="pv-rev-card-foot">
                  <button
                    type="button"
                    className={`pv-helpful-btn ${isLiked ? 'is-active' : ''}`}
                    onClick={() => toggleHelpful(r.id)}
                  >
                    Полезно ({count})
                  </button>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
