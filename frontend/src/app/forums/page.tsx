"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchForumCategories,
  fetchForumTopics,
  createForumTopic,
  ForumTopicItem,
} from "@/lib/strapi";
import { getCurrentUser } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import Icon from "@/components/ui/Icon";

export default function ForumsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [topics, setTopics] = useState<ForumTopicItem[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTopic, setNewTopic] = useState({ title: "", content: "", category: "" });

  useEffect(() => {
    Promise.all([
      fetchForumCategories().catch(() => []),
      fetchForumTopics().catch(() => []),
    ]).then(([cats, tps]) => {
      setCategories(cats);
      setTopics(tps);
      if (cats.length) setNewTopic((prev) => ({ ...prev, category: cats[0].documentId }));
      setLoading(false);
    });
  }, []);

  const handleCreate = async () => {
    if (!newTopic.title.trim() || creating) return;
    setCreating(true);
    const user = getCurrentUser();
    const author = user?.username || "Гость";

    try {
      const created = await createForumTopic({
        Title: newTopic.title.trim(),
        Content: newTopic.content.trim() || "Без описания",
        Author: author,
        Category: newTopic.category || undefined,
      });
      if (created) {
        setTopics((prev) => [{ ...created, id: created.documentId || created.id }, ...prev]);
        showToast("Тема создана", "success");
      }
    } catch {
      showToast("Не удалось создать тему", "error");
    } finally {
      setShowCreate(false);
      setCreating(false);
      setNewTopic({ title: "", content: "", category: categories[0]?.documentId || "" });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return topics.filter(
      (t) =>
        (!selected || t.Category?.documentId === selected) &&
        (!q || String(t.Title || "").toLowerCase().includes(q))
    );
  }, [topics, search, selected]);

  const dateOf = (iso?: string) =>
    iso
      ? new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })
      : "Недавно";

  if (loading) {
    return (
      <div className="ur-page">
        <div className="ur-empty">Загружаем форум…</div>
      </div>
    );
  }

  return (
    <div className="ur-page">
      <div className="ur-page-head">
        <div>
          <p className="ur-kicker">Обсуждения</p>
          <h1 className="ur-title">Форум</h1>
          <p className="ur-subtitle">Живые темы, реальные ответы — без шума</p>
        </div>
        <button className="ur-btn ur-btn--primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={16} /> Новая тема
        </button>
      </div>

      <div className="ur-friends-toolbar" style={{ marginBottom: 18 }}>
        <input
          className="ur-friends-search"
          placeholder="Поиск по темам…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="ur-forum-layout">
        <aside className="ur-forum-sidebar">
          <div className="ur-forum-side-title">Разделы</div>
          <button
            className={`ur-forum-cat ${selected === null ? "is-active" : ""}`}
            onClick={() => setSelected(null)}
          >
            <Icon name="chat" size={16} /> Все темы
            <small>{topics.length}</small>
          </button>
          {categories.map((cat) => (
            <button
              key={cat.documentId}
              className={`ur-forum-cat ${selected === cat.documentId ? "is-active" : ""}`}
              onClick={() => setSelected(cat.documentId)}
            >
              <Icon name="chat" size={16} />
              {cat.category_title || "Без названия"}
              <small>{topics.filter((t) => t.Category?.documentId === cat.documentId).length}</small>
            </button>
          ))}
        </aside>

        <section>
          <div className="ur-forum-clean-note">
            Заглушки и автоматические посты удалены. Остались только темы, которые создали игроки.
          </div>

          {filtered.length === 0 ? (
            <div className="ur-empty">Тем пока нет — начните первое обсуждение.</div>
          ) : (
            filtered.map((t) => (
              <Link className="ur-topic-row" key={t.id} href={`/forums/${t.id}`}>
                <span className="ur-topic-pin"><Icon name="chat" size={18} /></span>
                <div className="ur-topic-main">
                  <b>{t.Title || "Без названия"}</b>
                  <div className="ur-topic-tags">
                    <span>{t.Author || "Гость"}</span>
                    {t.Category?.category_title && <span>{t.Category.category_title}</span>}
                    <span><Icon name="chat" size={11} /> {t.MessagesCount || 0}</span>
                    <span><Icon name="eye" size={11} /> {t.Views || 0}</span>
                  </div>
                </div>
                <span className="ur-topic-date">{dateOf(t.createdAt)}</span>
              </Link>
            ))
          )}
        </section>
      </div>

      {showCreate && (
        <div className="ur-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="ur-modal" role="dialog" aria-modal="true" aria-label="Новая тема">
            <h3>Новая тема</h3>
            <p className="ur-subtitle">Напишите так, как рассказали бы другу</p>
            <label htmlFor="ur-topic-title">Заголовок</label>
            <input
              id="ur-topic-title"
              value={newTopic.title}
              onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
              placeholder="О чём хотите обсудить?"
            />
            <label htmlFor="ur-topic-cat">Раздел</label>
            <select
              id="ur-topic-cat"
              className="ur-modal-input"
              value={newTopic.category}
              onChange={(e) => setNewTopic({ ...newTopic, category: e.target.value })}
            >
              {categories.map((c) => (
                <option key={c.documentId} value={c.documentId}>
                  {c.category_title || "Без названия"}
                </option>
              ))}
            </select>
            <label htmlFor="ur-topic-content">Сообщение</label>
            <textarea
              id="ur-topic-content"
              rows={4}
              value={newTopic.content}
              onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
              placeholder="Пара предложений с сутью вопроса"
            />
            <div className="ur-modal-actions">
              <button className="ur-btn ur-btn--ghost" onClick={() => setShowCreate(false)}>Отмена</button>
              <button className="ur-btn ur-btn--primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Публикуем…" : "Опубликовать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
