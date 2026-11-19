"use client";

import { useEffect, useRef, useState } from "react";
import { getMessages, sendMessage, ChatMessage } from "@/lib/chat";
import Icon from "@/components/ui/Icon";

interface ChatPerson {
  id: string;
  name: string;
  status?: string;
  game?: string;
}

export default function ChatPanel({ person }: { person: ChatPerson }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages(getMessages(person.id));
  }, [person.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setMessages(sendMessage(person.id, text));
    setInput("");
  };

  return (
    <div className="ur-chat-pane">
      <div className="ur-chat-head">
        <div className="ur-avatar">
          {person.name[0]?.toUpperCase()}
          <i className={person.status === "online" ? "online" : ""} />
        </div>
        <div className="ur-friend-meta">
          <div className="ur-friend-name">{person.name}</div>
          <div className="ur-friend-sub">
            {person.status === "online" ? "В сети" : "Не в сети"}
            {person.game ? ` · ${person.game}` : ""}
          </div>
        </div>
        <button className="ur-icon-btn" type="button" aria-label="Информация о друге">
          <Icon name="user" size={16} />
        </button>
      </div>

      <div className="ur-chat-messages">
        {messages.length === 0 ? (
          <div className="ur-chat-empty">
            <div>
              <b>Начните разговор</b>
              <span>Сообщения сохраняются в этом браузере</span>
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div className={`ur-msg ${m.from === "me" ? "me" : "them"}`} key={`${m.time}-${i}`}>
              <div className="ur-msg-bubble">{m.text}</div>
              <div className="ur-msg-time">{m.time}</div>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="ur-chat-compose">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSend();
          }}
          placeholder={`Написать ${person.name}…`}
          aria-label="Сообщение"
        />
        <button className="ur-btn ur-btn--primary" onClick={handleSend} disabled={!input.trim()}>
          <Icon name="chat" size={15} /> Отправить
        </button>
      </div>
    </div>
  );
}
