"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { getJSON, setJSON } from "@/lib/storage";
import { fetchFromStrapi } from "@/lib/strapi";
import { showToast } from "@/lib/toast";
import Icon from "@/components/ui/Icon";
import ChatPanel from "@/components/chat/ChatPanel";
import AddFriendModal from "@/components/friends/AddFriendModal";

interface Friend {
  id: string;
  name: string;
  status: string;
  game: string;
}

interface Contact {
  id: string;
  title: string;
  value: string;
  link: string;
  buttonText: string;
}

type Tab = "friends" | "requests" | "contacts";

const DEFAULT_FRIENDS: Friend[] = [
  { id: "f1", name: "ShadowMaster", status: "online", game: "Counter-Strike 2" },
  { id: "f2", name: "DragonSlayer", status: "offline", game: "Dota 2" },
  { id: "f3", name: "ValorantPro", status: "online", game: "Valorant" },
  { id: "f4", name: "Лунатик", status: "online", game: "Elden Ring" },
  { id: "f5", name: "kitten.exe", status: "offline", game: "Stardew Valley" },
  { id: "f6", name: "Гром", status: "online", game: "GTA V" },
  { id: "f7", name: "mira", status: "online", game: "It Takes Two" },
];

const DEFAULT_REQUESTS = [
  {
    id: "req1",
    name: "NoobMaster69",
    message: "Привет! Видел тебя в CST, давай в команду?",
  },
];

export default function FriendsPage() {
  const [tab, setTab] = useState<Tab>("friends");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [selected, setSelected] = useState<Friend | null>(null);
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState({ title: "", link: "" });
  const [mounted, setMounted] = useState(false);

  const load = useCallback(() => {
    const saved = getJSON<Friend[]>("user_friends", []);
    const list = saved.length ? saved : DEFAULT_FRIENDS;
    if (!saved.length) setJSON("user_friends", list);
    setFriends(list);
    setRequests(getJSON("user_friend_requests", DEFAULT_REQUESTS));
    setSelected((prev) => list.find((f) => f.id === prev?.id) ?? null);
  }, []);

  useEffect(() => {
    setMounted(true);
    load();
    fetchFromStrapi("contacts")
      .then((data: any[]) => {
        if (Array.isArray(data)) {
          setContacts(
            data.map((c, i) => ({
              id: c.documentId || `contact_${i}`,
              title: c.title || "Контакт",
              value: c.value || "",
              link: c.link || "#",
              buttonText: c.buttonText || "Открыть",
            }))
          );
        }
      })
      .catch(() => {
        setContacts(
          getJSON<Contact[]>(
            "user_contacts",
            [
              {
                id: "c1",
                title: "Email поддержки",
                value: "Отвечаем в течение 24 часов",
                link: "mailto:support@unifiedstack.ru",
                buttonText: "Написать",
              },
            ]
          )
        );
      });
  }, [load]);

  const visibleFriends = useMemo(() => {
    const q = search.trim().toLowerCase();
    return friends.filter((f) => !q || f.name.toLowerCase().includes(q));
  }, [friends, search]);

  const handleRemove = (id: string, name: string) => {
    if (!window.confirm(`Удалить ${name} из друзей?`)) return;
    const updated = friends.filter((f) => f.id !== id);
    setFriends(updated);
    setJSON("user_friends", updated);
    if (selected?.id === id) setSelected(null);
    showToast(`${name} удалён из друзей`, "info");
  };

  const acceptRequest = (req: any) => {
    const friend: Friend = {
      id: req.id,
      name: req.name,
      status: "online",
      game: "Не в игре",
    };
    const updatedFriends = friends.some((f) => f.id === req.id)
      ? friends
      : [...friends, friend];
    setFriends(updatedFriends);
    setJSON("user_friends", updatedFriends);

    const updatedRequests = requests.filter((r) => r.id !== req.id);
    setRequests(updatedRequests);
    setJSON("user_friend_requests", updatedRequests);
    showToast(`${req.name} теперь ваш друг`, "success");
    setTab("friends");
    setSelected(friend);
  };

  const declineRequest = (id: string) => {
    const updated = requests.filter((r) => r.id !== id);
    setRequests(updated);
    setJSON("user_friend_requests", updated);
    showToast("Заявка отклонена", "info");
  };

  const addContact = () => {
    if (!newContact.title.trim() || !newContact.link.trim()) return;
    const contact: Contact = {
      id: "contact_" + Date.now(),
      title: newContact.title.trim(),
      value: newContact.link.trim(),
      link: newContact.link.trim(),
      buttonText: "Открыть",
    };
    const saved = [...contacts.filter((c) => !c.id.startsWith("contact_")), contact];
    setContacts(saved);
    setJSON("user_contacts", saved.filter((c) => c.id.startsWith("contact_")));
    setNewContact({ title: "", link: "" });
    setShowAddContact(false);
    showToast("Контакт добавлен", "success");
  };

  if (!mounted) return null;

  const onlineCount = friends.filter((f) => f.status === "online").length;

  return (
    <div className="ur-page">
      <div className="ur-page-head">
        <div>
          <p className="ur-kicker">Сообщество</p>
          <h1 className="ur-title">Друзья и контакты</h1>
          <p className="ur-subtitle">
            {friends.length} друзей · {onlineCount} в сети · {requests.length} заявок
          </p>
        </div>
        <button className="ur-btn ur-btn--primary" onClick={() => setShowAdd(true)}>
          <Icon name="plus" size={16} /> Добавить друга
        </button>
      </div>

      <div className="ur-friends-layout">
        <aside className="ur-friends-side">
          <div className="ur-friends-toolbar">
            <input
              className="ur-friends-search"
              placeholder="Поиск по друзьям…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <div className="ur-friends-tabs">
              <button
                className={`ur-friends-tab ${tab === "friends" ? "is-active" : ""}`}
                onClick={() => setTab("friends")}
              >
                Друзья
              </button>
              <button
                className={`ur-friends-tab ${tab === "requests" ? "is-active" : ""}`}
                onClick={() => setTab("requests")}
              >
                Заявки {requests.length > 0 && `· ${requests.length}`}
              </button>
              <button
                className={`ur-friends-tab ${tab === "contacts" ? "is-active" : ""}`}
                onClick={() => setTab("contacts")}
              >
                Контакты
              </button>
            </div>
          </div>

          <div className="ur-friend-list">
            {tab === "friends" &&
              (visibleFriends.length === 0 ? (
                <div className="ur-empty">Никого не нашлось</div>
              ) : (
                visibleFriends.map((f) => (
                  <div
                    className={`ur-friend ${selected?.id === f.id ? "is-active" : ""}`}
                    key={f.id}
                    onClick={() => setSelected(f)}
                  >
                    <div className="ur-avatar">
                      {f.name[0]?.toUpperCase()}
                      <i className={f.status === "online" ? "online" : ""} />
                    </div>
                    <div className="ur-friend-meta">
                      <div className="ur-friend-name">{f.name}</div>
                      <div className="ur-friend-sub">
                        {f.status === "online" ? "В сети" : "Не в сети"} · {f.game}
                      </div>
                    </div>
                    <div className="ur-friend-actions">
                      <button
                        className="ur-icon-btn"
                        aria-label={`Удалить ${f.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemove(f.id, f.name);
                        }}
                      >
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ))}

            {tab === "requests" &&
              (requests.length === 0 ? (
                <div className="ur-empty">Новых заявок нет</div>
              ) : (
                requests.map((r) => (
                  <div className="ur-friend" key={r.id}>
                    <div className="ur-avatar">{r.name[0]?.toUpperCase()}</div>
                    <div className="ur-friend-meta">
                      <div className="ur-friend-name">{r.name}</div>
                      <div className="ur-friend-sub">{r.message}</div>
                    </div>
                    <div className="ur-friend-actions">
                      <button className="ur-icon-btn" aria-label="Принять" onClick={() => acceptRequest(r)}>
                        <Icon name="plus" size={15} />
                      </button>
                      <button className="ur-icon-btn" aria-label="Отклонить" onClick={() => declineRequest(r.id)}>
                        <Icon name="close" size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ))}

            {tab === "contacts" && (
              <>
                <div className="ur-contact-grid">
                  {contacts.map((c) => (
                    <div className="ur-contact-card" key={c.id}>
                      <h4>{c.title}</h4>
                      <p>{c.value}</p>
                      <a className="ur-btn ur-btn--ghost" href={c.link} target="_blank" rel="noreferrer">
                        {c.buttonText}
                      </a>
                    </div>
                  ))}
                </div>
                <button className="ur-btn ur-btn--ghost" onClick={() => setShowAddContact(true)}>
                  <Icon name="plus" size={15} /> Добавить контакт
                </button>
              </>
            )}
          </div>
        </aside>

        {selected ? (
          <ChatPanel person={selected} />
        ) : (
          <div className="ur-chat-pane">
            <div className="ur-chat-empty">
              <div>
                <b>Выберите друга</b>
                <span>Чат откроется в этой панели</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {showAdd && <AddFriendModal onClose={() => setShowAdd(false)} onSuccess={load} />}

      {showAddContact && (
        <div className="ur-modal-backdrop" onClick={(e) => e.target === e.currentTarget && setShowAddContact(false)}>
          <div className="ur-modal" role="dialog" aria-modal="true" aria-label="Новый контакт">
            <h3>Новый контакт</h3>
            <p className="ur-subtitle">Ссылка, email или мессенджер</p>
            <label htmlFor="ur-contact-title">Название</label>
            <input
              id="ur-contact-title"
              value={newContact.title}
              onChange={(e) => setNewContact({ ...newContact, title: e.target.value })}
              placeholder="Например, Telegram команды"
            />
            <label htmlFor="ur-contact-link">Ссылка</label>
            <input
              id="ur-contact-link"
              value={newContact.link}
              onChange={(e) => setNewContact({ ...newContact, link: e.target.value })}
              placeholder="https://…"
            />
            <div className="ur-modal-actions">
              <button className="ur-btn ur-btn--ghost" onClick={() => setShowAddContact(false)}>Отмена</button>
              <button className="ur-btn ur-btn--primary" onClick={addContact}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
