"use client";

import { useState } from "react";
import { getJSON, setJSON } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import Icon from "@/components/ui/Icon";

const SUGGESTIONS = ["NightOwl", "Волк_87", "pixelwitch", "ТихийЧас", "Zenith"];

export default function AddFriendModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("Привет! Давай поиграем вместе.");

  const submit = (nick: string) => {
    const name = nick.trim();
    if (!name) return;

    const friends = getJSON<any[]>("user_friends", []);
    if (friends.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      showToast("Этот пользователь уже у вас в друзьях", "error");
      return;
    }

    const requests = getJSON<any[]>("user_friend_requests", []);
    if (requests.some((r) => r.name.toLowerCase() === name.toLowerCase())) {
      showToast("Заявка уже отправлена", "info");
      return;
    }

    setJSON("user_friend_requests", [
      ...requests,
      {
        id: "req_" + Date.now(),
        name,
        message: message.trim() || "Хочет добавить вас в друзья",
        outgoing: true,
      },
    ]);
    showToast(`Заявка отправлена: ${name}`, "success");
    onSuccess();
    onClose();
  };

  return (
    <div className="ur-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="ur-modal" role="dialog" aria-modal="true" aria-label="Добавить друга">
        <div className="ur-page-head" style={{ marginBottom: 8 }}>
          <div>
            <h3>Добавить друга</h3>
            <p className="ur-subtitle">Отправьте заявку по никнейму или выберите из подсказок</p>
          </div>
          <button className="ur-icon-btn" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={16} />
          </button>
        </div>

        <label htmlFor="ur-friend-nick">Никнейм</label>
        <input
          id="ur-friend-nick"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit(nickname)}
          placeholder="Например, ShadowMaster"
          autoFocus
        />

        <label htmlFor="ur-friend-msg">Сообщение с заявкой</label>
        <textarea
          id="ur-friend-msg"
          rows={2}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />

        <div className="ur-suggestions">
          <div className="ur-forum-side-title">Может, это вы?</div>
          {SUGGESTIONS.filter((s) => s.toLowerCase().includes(nickname.toLowerCase())).map((s) => (
            <button className="ur-suggestion" key={s} onClick={() => submit(s)}>
              <span className="ur-avatar" style={{ width: 30, height: 30, borderRadius: 9 }}>
                {s[0]}
              </span>
              <span>{s}</span>
              <small>Отправить заявку</small>
            </button>
          ))}
        </div>

        <div className="ur-modal-actions">
          <button className="ur-btn ur-btn--ghost" onClick={onClose}>Отмена</button>
          <button className="ur-btn ur-btn--primary" onClick={() => submit(nickname)}>
            Отправить заявку
          </button>
        </div>
      </div>
    </div>
  );
}
