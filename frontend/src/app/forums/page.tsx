"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchForumCategories,
  fetchForumTopics,
  createForumTopic,
  ForumTopicItem,
} from "@/lib/strapi";
import { getCurrentUser } from "@/lib/auth";
import { showToast } from "@/lib/toast";
import Icon, { IconName } from "@/components/ui/Icon";

const CATEGORY_ICONS: IconName[] = ["chat", "tools", "trophy", "gamepad", "help"];

export default function ForumsPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [topics, setTopics] = useState<ForumTopicItem[]>([]);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newTopic, setNewTopic] = useState({
    title: "",
    content: "",
    category: "",
  });

  useEffect(() => {
    Promise.all([
      fetchForumCategories().catch((e) => {
        console.error("[forums] Категории:", e);
        return [];
      }),
      fetchForumTopics().catch((e) => {
        console.error("[forums] Темы:", e);
        return [];
      }),
    ]).then(([cats, tps]) => {
      setCategories(cats);
      setTopics(tps);
      if (cats.length > 0) setNewTopic((prev) => ({ ...prev, category: cats[0].documentId }));
      setLoading(false);
    });
  }, []);

  // Создание темы: POST в Strapi, при ошибке — локально
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
        setTopics((prev) => [
          { ...created, id: created.documentId || created.id },
          ...prev,
        ]);
        showToast("Тема создана!", "success");
      }
    } catch (err: any) {
      console.error("[forums] Не удалось создать тему:", err);
      const fallback: ForumTopicItem = {
        id: "t_" + Date.now(),
        Title: newTopic.title.trim(),
        Content: newTopic.content.trim() || "Без описания",
        Author: author,
        Views: 0,
        MessagesCount: 0,
      };
      setTopics((prev) => [fallback, ...prev]);
      showToast("Сервер недоступен — тема сохранена локально", "info");
    } finally {
      setShowCreate(false);
      setCreating(false);
      setNewTopic({
        title: "",
        content: "",
        category: categories[0]?.documentId || "",
      });
    }
  };

  const filtered = topics.filter((t) => {
    const matchesSearch = (t.Title || "").toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      !selectedCategory || t.Category?.documentId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const formatDate = (iso?: string) => {
    if (!iso) return "Недавно";
    return new Date(iso).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return <div className="forums-page">Загрузка форумов...</div>;
  }

  return (
    <div className="forums-page">
      <div className="forums-container">
        <div className="forums-header">
          <h1 className="forums-title">Форумы</h1>
          <div className="forums-search">
            <input
              type="text"
              placeholder="Поиск по темам..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <button className="forums-search-btn" onClick={() => setShowCreate(true)}>
              + Новая тема
            </button>
          </div>
        </div>

        {/* Категории */}
        <div className="forums-categories">
          <h2 className="section-title">Категории</h2>
          {categories.length === 0 ? (
            <p className="forums-empty">Категорий пока нет — создайте первую тему</p>
          ) : (
            categories.map((cat, idx) => {
              const isActive = selectedCategory === cat.documentId;
              return (
                <div
                  key={cat.documentId}
                  className={`category-card ${isActive ? "active" : ""}`}
                  onClick={() =>
                    setSelectedCategory(isActive ? null : cat.documentId)
                  }
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      setSelectedCategory(isActive ? null : cat.documentId);
                    }
                  }}
                >
                  <div className="category-icon">
                    <Icon name={CATEGORY_ICONS[idx % CATEGORY_ICONS.length]} size={24} />
                  </div>
                  <div className="category-info">
                    <h3>{cat.category_title || "Без названия"}</h3>
                    <p>{cat.Description || ""}</p>
                    <div className="category-stats">
                      <span>Тем: {cat.TopicsCount || 0}</span>
                      <span>Сообщений: {cat.MessagesCount || 0}</span>
                    </div>
                  </div>
                  <div className="category-last">
                    {cat.LastTopic && <span className="last-topic">{cat.LastTopic}</span>}
                    <span className="last-time">{cat.LastTime || "Недавно"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Темы */}
        <div className="popular-topics">
          <h2 className="section-title">
            {selectedCategory
              ? `Темы: ${categories.find((c) => c.documentId === selectedCategory)?.category_title || ""}`
              : "Все темы"}
          </h2>
          <div className="topics-list">
            {filtered.length === 0 ? (
              <p className="forums-empty">Тем не найдено</p>
            ) : (
              filtered.map((t) => (
                <Link
                  key={t.id}
                  href={`/forums/${t.id}`}
                  className="topic-item"
                  style={{ textDecoration: "none" }}
                >
                  <div className="topic-icon">
                    <Icon name="chat" size={20} />
                  </div>
                  <div className="topic-info">
                    <span className="topic-title">{t.Title || "Без названия"}</span>
                    <div className="topic-meta">
                      <span>Автор: {t.Author || "Неизвестен"}</span>
                      {t.Category?.category_title && (
                        <span>{t.Category.category_title}</span>
                      )}
                      <span>
                        <Icon name="chat" size={12} /> {t.MessagesCount || 0}
                      </span>
                      <span>
                        <Icon name="eye" size={12} /> {t.Views || 0}
                      </span>
                    </div>
                  </div>
                  <div className="topic-last">{formatDate(t.createdAt)}</div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Модалка создания темы */}
      {showCreate && (
        <div className="forum-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="forum-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="forum-modal-title">Новая тема</h3>
            <input
              type="text"
              placeholder="Заголовок"
              value={newTopic.title}
              onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
              className="forum-modal-input"
            />
            <select
              value={newTopic.category}
              onChange={(e) => setNewTopic({ ...newTopic, category: e.target.value })}
              className="forum-modal-input"
            >
              {categories.length === 0 && <option value="">Общие обсуждения</option>}
              {categories.map((cat) => (
                <option key={cat.documentId} value={cat.documentId}>
                  {cat.category_title || "Без названия"}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Текст сообщения"
              value={newTopic.content}
              onChange={(e) => setNewTopic({ ...newTopic, content: e.target.value })}
              className="forum-modal-textarea"
            />
            <div className="forum-modal-actions">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="forum-modal-submit"
              >
                {creating ? "Создание..." : "Создать"}
              </button>
              <button onClick={() => setShowCreate(false)} className="forum-modal-cancel">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
