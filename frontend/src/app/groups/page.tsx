"use client";

import { useState, useEffect } from "react";
import { getJSON, setJSON } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import { fetchGroups, createGroup } from "@/lib/strapi";
import Icon from "@/components/ui/Icon";

interface Group {
  id: string;
  name: string;
  desc: string;
  members: number;
  posts: number;
  color: string;
  isMember: boolean;
  isOwner?: boolean;
}

export default function GroupsPage() {
  const [activeTab, setActiveTab] = useState<"my" | "popular">("my");
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", desc: "" });

  useEffect(() => {
    fetchGroups()
      .then((data) => {
        // Адаптируем данные из коллекции Group
        const adapted: Group[] = data.map((item: any) => ({
          id: item.documentId,
          name: item.Title || "Без названия",
          desc: item.Description || "Без описания",
          members: Number(item.Members) || 0,
          posts: Number(item.Posts) || 0,
          color: item.Color || "#8f3ed1",
          isMember: false,
        }));

        // Проверяем, в каких группах уже состоит пользователь
        const userGroups = getJSON<string[]>("user_groups", []);
        const withMembership = adapted.map((g) => ({
          ...g,
          isMember: userGroups.includes(g.id),
        }));

        setGroups(withMembership);
      })
      .catch((err) => console.error("[groups] Ошибка загрузки:", err))
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = (id: string) => {
    const updated = groups.map((g) =>
      g.id === id ? { ...g, isMember: true, members: g.members + 1 } : g
    );
    setGroups(updated);

    const userGroups = getJSON<string[]>("user_groups", []);
    if (!userGroups.includes(id)) {
      setJSON("user_groups", [...userGroups, id]);
    }
    showToast("Вы вступили в группу!", "success");
  };

  const handleLeave = (id: string) => {
    const updated = groups.map((g) =>
      g.id === id ? { ...g, isMember: false, members: g.members - 1 } : g
    );
    setGroups(updated);

    const userGroups = getJSON<string[]>("user_groups", []);
    setJSON(
      "user_groups",
      userGroups.filter((gid) => gid !== id)
    );

    showToast("Вы покинули группу", "info");
  };

  // Создание группы: POST в Strapi, при ошибке — локально
  const handleCreate = async () => {
    if (!newGroup.name.trim() || creating) return;
    setCreating(true);
    const color =
      "#" + Math.floor(Math.random() * 16777215).toString(16).padStart(6, "0");

    try {
      const created = await createGroup({
        Title: newGroup.name.trim(),
        Description: newGroup.desc.trim() || "Без описания",
        Members: 1,
        Posts: 0,
        Color: color,
      });
      if (created) {
        const createdGroup: Group = {
          id: created.documentId || "g_" + Date.now(),
          name: created.Title || newGroup.name.trim(),
          desc: created.Description || "Без описания",
          members: Number(created.Members) || 1,
          posts: Number(created.Posts) || 0,
          color: created.Color || color,
          isMember: true,
          isOwner: true,
        };
        setGroups((prev) => [createdGroup, ...prev]);
        const userGroups = getJSON<string[]>("user_groups", []);
        setJSON("user_groups", [...userGroups, createdGroup.id]);
      }
      showToast("Группа создана!", "success");
    } catch (err: any) {
      console.error("[groups] Не удалось создать группу:", err);
      const fallback: Group = {
        id: "g_" + Date.now(),
        name: newGroup.name.trim(),
        desc: newGroup.desc.trim() || "Без описания",
        members: 1,
        posts: 0,
        color,
        isMember: true,
        isOwner: true,
      };
      setGroups((prev) => [fallback, ...prev]);
      showToast("Сервер недоступен — группа сохранена локально", "info");
    } finally {
      setCreating(false);
      setShowCreate(false);
      setNewGroup({ name: "", desc: "" });
      setActiveTab("my");
    }
  };

  const displayed =
    activeTab === "my"
      ? groups.filter((g) => g.isMember)
      : groups.filter((g) => !g.isMember);

  if (loading) {
    return <div className="groups-page groups-loading">Загрузка групп...</div>;
  }

  return (
    <div className="groups-page">
      <div className="groups-container">
        <div className="groups-header">
          <h1 className="groups-title">Группы и сообщества</h1>
          <p className="groups-subtitle">
            Находите единомышленников и играйте вместе
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="create-group-btn"
          >
            <Icon name="plus" size={18} /> Создать группу
          </button>
        </div>

        <div className="groups-tabs">
          <button
            onClick={() => setActiveTab("my")}
            className={`groups-tab-btn ${activeTab === "my" ? "active" : ""}`}
          >
            <Icon name="users" size={18} />
            Мои группы
            <span className="tab-count">
              {groups.filter((g) => g.isMember).length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab("popular")}
            className={`groups-tab-btn ${activeTab === "popular" ? "active" : ""}`}
          >
            <Icon name="fire" size={18} />
            Популярные
            <span className="tab-count">
              {groups.filter((g) => !g.isMember).length}
            </span>
          </button>
        </div>

        {displayed.length === 0 ? (
          <p className="groups-empty">
            {activeTab === "my"
              ? "Вы пока не состоите ни в одной группе"
              : "Нет доступных групп"}
          </p>
        ) : (
          <div className="groups-grid">
            {displayed.map((g) => (
              <div key={g.id} className="group-card">
                <div className="group-color-bar" style={{ background: g.color }}></div>
                <div className="group-info">
                  <div className="group-header">
                    <h3>{g.name}</h3>
                    {g.isOwner && <span className="group-badge">Создатель</span>}
                  </div>
                  <p className="group-description">{g.desc}</p>
                  <div className="group-stats">
                    <div className="stat">
                      <span className="stat-value">
                        {g.members.toLocaleString("ru-RU")}
                      </span>
                      <span className="stat-label">участников</span>
                    </div>
                    <div className="stat">
                      <span className="stat-value">{g.posts}</span>
                      <span className="stat-label">постов</span>
                    </div>
                  </div>
                  {g.isMember ? (
                    <div className="group-actions">
                      <button
                        onClick={() =>
                          showToast(`Открываем группу "${g.name}"`, "info")
                        }
                        className="group-btn primary"
                      >
                        Открыть
                      </button>
                      {!g.isOwner && (
                        <button
                          onClick={() => handleLeave(g.id)}
                          className="group-btn secondary"
                        >
                          Выйти
                        </button>
                      )}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleJoin(g.id)}
                      className="group-btn primary join-btn"
                    >
                      Вступить
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Модалка создания группы */}
      {showCreate && (
        <div className="forum-modal-overlay" onClick={() => setShowCreate(false)}>
          <div className="forum-modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="forum-modal-title">Создать группу</h3>
            <input
              type="text"
              placeholder="Название"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              className="forum-modal-input"
            />
            <textarea
              placeholder="Описание"
              value={newGroup.desc}
              onChange={(e) => setNewGroup({ ...newGroup, desc: e.target.value })}
              className="forum-modal-textarea forum-modal-textarea--short"
            />
            <div className="forum-modal-actions">
              <button
                onClick={handleCreate}
                disabled={creating}
                className="forum-modal-submit"
              >
                {creating ? "Создание..." : "Создать"}
              </button>
              <button
                onClick={() => setShowCreate(false)}
                className="forum-modal-cancel"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
