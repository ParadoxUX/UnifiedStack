"use client";

import { useEffect, useMemo, useState } from "react";
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

const COLORS = ["#8b5cf6", "#f39c12", "#e74c3c", "#2ecc71", "#3498db", "#e67e22"];

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [tab, setTab] = useState<"my" | "all">("my");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: "", desc: "", color: COLORS[0] });

  useEffect(() => {
    fetchGroups()
      .then((data: any[]) => {
        const mine = getJSON<string[]>("user_groups", []);
        const adapted: Group[] = (Array.isArray(data) ? data : []).map((item, i) => ({
          id: item.documentId || `g_${i}`,
          name: item.Title || "Без названия",
          desc: item.Description || "Описание пока не добавлено",
          members: Number(item.Members) || 0,
          posts: Number(item.Posts) || 0,
          color: item.Color || COLORS[i % COLORS.length],
          isMember: mine.includes(item.documentId),
        }));
        setGroups(adapted);
      })
      .catch(() => showToast("Не удалось загрузить группы", "error"))
      .finally(() => setLoading(false));
  }, []);

  const toggleMember = (id: string) => {
    const group = groups.find((g) => g.id === id);
    if (!group) return;
    const joining = !group.isMember;
    setGroups((prev) =>
      prev.map((g) =>
        g.id === id
          ? { ...g, isMember: joining, members: Math.max(0, g.members + (joining ? 1 : -1)) }
          : g
      )
    );
    const mine = getJSON<string[]>("user_groups", []);
    setJSON("user_groups", joining ? [...new Set([...mine, id])] : mine.filter((x) => x !== id));
    showToast(joining ? `Вы вступили в «${group.name}»` : `Вы покинули «${group.name}»`, joining ? "success" : "info");
  };

  const handleCreate = async () => {
    if (!newGroup.name.trim() || creating) return;
    setCreating(true);
    try {
      const created = await createGroup({
        Title: newGroup.name.trim(),
        Description: newGroup.desc.trim() || "Новое сообщество",
        Members: 1,
        Posts: 0,
        Color: newGroup.color,
      });
      const group: Group = {
        id: created?.documentId || `g_${Date.now()}`,
        name: created?.Title || newGroup.name.trim(),
        desc: created?.Description || "Новое сообщество",
        members: 1,
        posts: 0,
        color: created?.Color || newGroup.color,
        isMember: true,
        isOwner: true,
      };
      setGroups((prev) => [group, ...prev]);
      setJSON("user_groups", [...new Set([...getJSON<string[]>("user_groups", []), group.id])]);
      setTab("my");
      showToast("Группа создана", "success");
    } catch {
      showToast("Не удалось создать группу — попробуйте позже", "error");
    } finally {
      setCreating(false);
      setShowCreate(false);
      setNewGroup({ name: "", desc: "", color: COLORS[0] });
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return groups.filter(
      (g) =>
        (tab === "my" ? g.isMember : !g.isMember) &&
        (!q || g.name.toLowerCase().includes(q) || g.desc.toLowerCase().includes(q))
    );
  }, [groups, tab, search]);

  const totalMembers = groups.reduce((sum, g) => sum + g.members, 0);

  if (loading) {
    return (
      <div className="ur-page">
        <div className="ur-empty">Загружаем сообщества…</div>
      </div>
    );
  }

  return (
    <div className="ur-page">
      <div className="ur-page-head">
        <div>
          <p className="ur-kicker">Сообщество</p>
          <h1 className="ur-title">Группы</h1>
          <p className="ur-subtitle">Найдите своих — и играйте вместе</p>
        </div>
        <button className="ur-btn ur-btn--primary" onClick={() => setShowCreate(true)}>
          <Icon name="plus" size={16} /> Создать группу
        </button>
      </div>

      <div className="ur-community-strip">
        <div className="ur-stat-card"><b>{groups.length}</b><span>сообществ</span></div>
        <div className="ur-stat-card"><b>{groups.filter((g) => g.isMember).length}</b><span>моих групп</span></div>
        <div className="ur-stat-card"><b>{totalMembers.toLocaleString("ru-RU")}</b><span>участников</span></div>
        <div className="ur-stat-card"><b>{groups.reduce((s, g) => s + g.posts, 0)}</b><span>постов</span></div>
      </div>

      <div className="ur-chip-row">
        <button className={`ur-chip ${tab === "my" ? "is-active" : ""}`} onClick={() => setTab("my")}>
          Мои группы
        </button>
        <button className={`ur-chip ${tab === "all" ? "is-active" : ""}`} onClick={() => setTab("all")}>
          Рекомендуем
        </button>
      </div>

      <div className="ur-friends-toolbar" style={{ marginBottom: 18 }}>
        <input
          className="ur-friends-search"
          placeholder="Поиск сообществ…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="ur-empty">
          {tab === "my" ? "Вы пока не состоите ни в одной группе — загляните в «Рекомендуем»" : "Ничего не найдено"}
        </div>
      ) : (
        <div className="ur-group-grid">
          {filtered.map((g, i) => (
            <article className="ur-group-card" key={g.id} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="ur-group-cover" style={{ background: `linear-gradient(135deg, ${g.color}, #20263b)` }} />
              <div className="ur-group-body">
                <h3>
                  {g.name}
                  {g.isOwner && <span className="ur-chip is-active" style={{ fontSize: 10, padding: "3px 8px" }}>Создатель</span>}
                </h3>
                <p>{g.desc}</p>
                <div className="ur-group-members">
                  <div className="ur-mini-avatars">
                    <i /><i /><i />
                  </div>
                  <small>{g.members.toLocaleString("ru-RU")} участников · {g.posts} постов</small>
                </div>
                <div className="ur-group-actions">
                  <button className="ur-btn ur-btn--primary" onClick={() => toggleMember(g.id)}>
                    {g.isMember ? "Выйти" : "Вступить"}
                  </button>
                  <button
                    className="ur-btn ur-btn--ghost"
                    onClick={() => showToast(`Сообщество «${g.name}» откроется в следующем обновлении`, "info")}
                  >
                    Открыть
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="ur-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="ur-modal" role="dialog" aria-modal="true" aria-label="Новая группа">
            <h3>Новая группа</h3>
            <p className="ur-subtitle">Соберите людей вокруг одной игры или идеи</p>
            <label htmlFor="ur-group-name">Название</label>
            <input
              id="ur-group-name"
              value={newGroup.name}
              onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              placeholder="Например, Ночной рейд"
            />
            <label htmlFor="ur-group-desc">Описание</label>
            <textarea
              id="ur-group-desc"
              rows={3}
              value={newGroup.desc}
              onChange={(e) => setNewGroup({ ...newGroup, desc: e.target.value })}
              placeholder="О чём ваше сообщество?"
            />
            <label>Цвет обложки</label>
            <div className="ur-chip-row" style={{ marginTop: 8 }}>
              {COLORS.map((c) => (
                <button
                  key={c}
                  aria-label={`Цвет ${c}`}
                  onClick={() => setNewGroup({ ...newGroup, color: c })}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: 8,
                    border: newGroup.color === c ? "2px solid #fff" : "2px solid transparent",
                    background: c,
                    cursor: "pointer",
                  }}
                />
              ))}
            </div>
            <div className="ur-modal-actions">
              <button className="ur-btn ur-btn--ghost" onClick={() => setShowCreate(false)}>Отмена</button>
              <button className="ur-btn ur-btn--primary" onClick={handleCreate} disabled={creating}>
                {creating ? "Создание…" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
