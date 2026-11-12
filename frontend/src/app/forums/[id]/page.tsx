'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  fetchForumTopicById,
  fetchForumPosts,
  createForumPost,
  ForumTopicItem,
  ForumPostItem,
} from '@/lib/strapi';
import { getCurrentUser } from '@/lib/auth';
import { showToast } from '@/lib/toast';
import Icon from '@/components/ui/Icon';

export default function ForumTopicPage() {
  const params = useParams();
  const router = useRouter();
  const topicId = params.id as string;

  const [topic, setTopic] = useState<ForumTopicItem | null>(null);
  const [replies, setReplies] = useState<ForumPostItem[]>([]);
  const [newReply, setNewReply] = useState('');
  const [mounted, setMounted] = useState(false);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    setMounted(true);

    Promise.all([
      fetchForumTopicById(topicId),
      fetchForumPosts(topicId).catch(() => []),
    ])
      .then(([topicData, posts]) => {
        if (topicData) {
          setTopic(topicData);
          setReplies(posts || []);
        } else {
          router.push('/forums');
        }
      })
      .catch((err) => {
        console.error('[forum topic] Ошибка загрузки:', err);
        router.push('/forums');
      });
  }, [topicId, router]);

  const handleSendReply = async () => {
    if (!newReply.trim() || sending) return;
    setSending(true);
    const user = getCurrentUser();
    const authorName = user ? user.username : 'Гость';

    try {
      const created = await createForumPost({
        Message: newReply.trim(),
        Author: authorName,
        Topic: topicId,
      });
      if (created) {
        setReplies((prev) => [...prev, created]);
        setTopic((prev) =>
          prev ? { ...prev, MessagesCount: (prev.MessagesCount || 0) + 1 } : prev
        );
        setNewReply('');
        showToast('Ответ отправлен', 'success');
      }
    } catch (err: any) {
      console.error('[forum topic] Не удалось отправить ответ:', err);
      showToast('Не удалось отправить ответ на сервер', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!mounted || !topic) {
    return <div className="forums-page forums-thread-loading">Загрузка темы...</div>;
  }

  return (
    <div className="forums-page">
      <div className="forums-container forums-thread-container">
        <Link href="/forums" className="forums-back-link">← Назад к форумам</Link>

        <div className="forums-thread-card">
          <h1 className="forums-thread-title">{topic.Title || 'Без названия'}</h1>
          <div className="topic-meta forums-thread-meta">
            <span>Автор: {topic.Author || 'Неизвестен'}</span>
            {topic.Category?.category_title && <span>{topic.Category.category_title}</span>}
            <span>
              <Icon name="chat" size={12} /> {topic.MessagesCount || replies.length}
            </span>
            <span>
              <Icon name="eye" size={12} /> {topic.Views || 0}
            </span>
          </div>
          {topic.Content && (
            <p className="forums-thread-content">{topic.Content}</p>
          )}
        </div>

        <h2 className="section-title">Ответы ({replies.length})</h2>
        <div className="topics-list">
          {replies.length === 0 ? (
            <p className="forums-empty">Ответов пока нет — будьте первым!</p>
          ) : (
            replies.map((r) => (
              <div key={r.id} className="forums-reply-item">
                <div className="forums-reply-avatar">{(r.Author || '?')[0]}</div>
                <div className="forums-reply-body">
                  <div className="forums-reply-head">
                    <span className="forums-reply-author">{r.Author || 'Гость'}</span>
                    <span className="forums-reply-date">
                      {r.createdAt
                        ? new Date(r.createdAt).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : ''}
                    </span>
                  </div>
                  <p className="forums-reply-text">{r.Message}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Форма ответа */}
        <div className="forums-reply-form">
          <textarea
            placeholder="Ваш ответ..."
            value={newReply}
            onChange={(e) => setNewReply(e.target.value)}
            className="forums-reply-input"
          />
          <button
            onClick={handleSendReply}
            disabled={sending || !newReply.trim()}
            className="forums-reply-submit"
          >
            {sending ? 'Отправка...' : 'Ответить'}
          </button>
        </div>
      </div>
    </div>
  );
}
