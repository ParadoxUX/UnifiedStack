"use client";

import { useState, useEffect } from "react";
import {
  fetchFaqs,
  fetchContacts,
  fetchUsefulLinks,
  fetchRequirements,
  fetchSupportTickets,
  fetchSupportTicketById,
  createSupportTicket,
  SupportTicketItem,
} from "@/lib/strapi";
import { getCurrentUser } from "@/lib/auth";
import { getJSON, setJSON } from "@/lib/storage";
import { showToast } from "@/lib/toast";
import Icon from "@/components/ui/Icon";
import Link from "next/link";

const TICKET_CATEGORIES = [
  { value: "account", label: "Аккаунт и вход" },
  { value: "payment", label: "Платежи и покупки" },
  { value: "technical", label: "Технические проблемы" },
  { value: "other", label: "Другое" },
];

const TICKET_PRIORITIES = [
  { value: "low", label: "Низкий" },
  { value: "medium", label: "Средний" },
  { value: "high", label: "Высокий" },
];

const STATUS_LABELS: Record<string, { label: string; className: string }> = {
  open: { label: "Открыт", className: "open" },
  answered: { label: "Есть ответ", className: "answered" },
  closed: { label: "Закрыт", className: "closed" },
};

type Tab = "faq" | "tickets" | "new";

export default function SupportPage() {
  const [tab, setTab] = useState<Tab>("faq");
  const [faqs, setFaqs] = useState<any[]>([]);
  const [contacts, setContacts] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const [requirements, setRequirements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [faqSearch, setFaqSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  // Тикеты
  const [tickets, setTickets] = useState<SupportTicketItem[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicketItem | null>(null);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    Subject: "",
    Category: "technical",
    Priority: "medium",
    Message: "",
    ContactEmail: "",
  });

  useEffect(() => {
    const user = getCurrentUser();
    setTicketForm((prev) => ({ ...prev, ContactEmail: user?.email || "" }));

    Promise.all([
      fetchFaqs().catch((e) => {
        console.error("FAQ:", e);
        return [];
      }),
      fetchContacts().catch((e) => {
        console.error("Contacts:", e);
        return [];
      }),
      fetchUsefulLinks().catch((e) => {
        console.error("Links:", e);
        return [];
      }),
      fetchRequirements().catch((e) => {
        console.error("Requirements:", e);
        return [];
      }),
    ]).then(([f, c, l, r]) => {
      setFaqs(f);
      setContacts(c);
      setLinks(l);
      setRequirements(r);
      setLoading(false);
    });
  }, []);

  // Загрузка тикетов пользователя (по email + по сохранённым номерам)
  const loadTickets = async () => {
    setTicketsLoading(true);
    try {
      const user = getCurrentUser();
      const email = user?.email || ticketForm.ContactEmail.trim().toLowerCase();
      const savedIds = getJSON<string[]>("user_tickets", []);

      const byEmail = email
        ? await fetchSupportTickets(email).catch(() => [])
        : [];

      const byId = await Promise.all(
        savedIds.map((id) => fetchSupportTicketById(id).catch(() => null))
      );

      const merged = [...byEmail, ...byId.filter(Boolean)] as SupportTicketItem[];
      // Убираем дубликаты по documentId
      const unique = merged.filter(
        (t, i, arr) => t && t.id && arr.findIndex((x) => x.id === t.id) === i
      );
      setTickets(unique);
    } finally {
      setTicketsLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "tickets") loadTickets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Создание тикета
  const handleCreateTicket = async () => {
    const { Subject, Message, ContactEmail } = ticketForm;
    if (!Subject.trim() || !Message.trim() || !ContactEmail.trim() || submitting) return;
    setSubmitting(true);

    const payload = {
      ...ticketForm,
      Subject: Subject.trim(),
      Message: Message.trim(),
      ContactEmail: ContactEmail.trim().toLowerCase(),
      Status: "open",
      TicketNumber: "TK-" + Date.now().toString(36).toUpperCase(),
    };

    try {
      const created = await createSupportTicket(payload);
      if (created?.id) {
        const savedIds = getJSON<string[]>("user_tickets", []);
        setJSON("user_tickets", [...savedIds, created.documentId || created.id]);
      }
      showToast(
        `Тикет создан! Номер: ${payload.TicketNumber}. Ответ придёт на ${payload.ContactEmail}`,
        "success"
      );
      setTicketForm({
        Subject: "",
        Category: "technical",
        Priority: "medium",
        Message: "",
        ContactEmail,
      });
      setTab("tickets");
    } catch (err: any) {
      console.error("[supports] Не удалось создать тикет:", err);
      showToast("Не удалось создать тикет. Проверьте подключение к серверу.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredFaqs = faqs.filter((f) => {
    const q = f.question || f.Question || "";
    const a = f.answer || f.Answer || "";
    const s = faqSearch.toLowerCase();
    return q.toLowerCase().includes(s) || a.toLowerCase().includes(s);
  });

  const contactTitle = (c: any) => c.title || c.Title || "Контакт";
  const contactDesc = (c: any) => c.value || c.Value || "";
  const contactLink = (c: any) => c.link || c.Link || "";
  const contactBtn = (c: any) => c.buttonText || c.ButtonText || "Перейти";

  if (loading) {
    return <div className="supports-page">Загрузка...</div>;
  }

  return (
    <div className="supports-page">
      <div className="supports-container">
        <h1 className="supports-title">Центр поддержки</h1>
        <p className="supports-subtitle">
          Найдите ответ в FAQ или создайте тикет — мы ответим на почту
        </p>

        {/* Табы */}
        <div className="supports-tabs">
          <button
            onClick={() => setTab("faq")}
            className={`supports-tab-btn ${tab === "faq" ? "active" : ""}`}
          >
            <Icon name="help" size={18} /> FAQ
          </button>
          <button
            onClick={() => setTab("tickets")}
            className={`supports-tab-btn ${tab === "tickets" ? "active" : ""}`}
          >
            <Icon name="ticket" size={18} /> Мои тикеты
          </button>
          <button
            onClick={() => setTab("new")}
            className={`supports-tab-btn ${tab === "new" ? "active" : ""}`}
          >
            <Icon name="edit" size={18} /> Новый тикет
          </button>
        </div>

        {/* ===== TAB: FAQ ===== */}
        {tab === "faq" && (
          <>
            <div className="supports-search">
              <input
                type="text"
                placeholder="Поиск по вопросам..."
                value={faqSearch}
                onChange={(e) => setFaqSearch(e.target.value)}
                className="supports-search-input"
              />
              <button
                onClick={() => setOpenFaq(null)}
                className="supports-search-btn"
              >
                Найти
              </button>
            </div>

            <div className="supports-grid">
              {/* FAQ */}
              <div className="supports-section">
                <h2 className="supports-section-title">
                  Часто задаваемые вопросы
                </h2>
                <div className="faq-list">
                  {filteredFaqs.length === 0 && (
                    <p className="supports-empty">
                      {faqSearch
                        ? "Ничего не найдено. Попробуйте другой запрос или создайте тикет."
                        : "Вопросов пока нет"}
                    </p>
                  )}
                  {filteredFaqs.map((faq) => {
                    const id = faq.documentId;
                    const isOpen = openFaq === id;
                    return (
                      <div
                        key={id}
                        className={`faq-item ${isOpen ? "active" : ""}`}
                      >
                        <button
                          onClick={() => setOpenFaq(isOpen ? null : id)}
                          className="faq-question"
                        >
                          {faq.question || faq.Question || "Вопрос без названия"}
                        </button>
                        <div className="faq-answer">
                          {faq.answer || faq.Answer || "Ответ отсутствует"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Контакты */}
              <div className="supports-section">
                <h2 className="supports-section-title">Связаться с нами</h2>
                <div className="contact-cards">
                  {contacts.length === 0 && (
                    <p className="supports-empty">Контактов пока нет</p>
                  )}
                  {contacts.map((contact) => (
                    <div key={contact.documentId} className="contact-card">
                      <div>
                        <h3>{contactTitle(contact)}</h3>
                        <p>{contactDesc(contact)}</p>
                      </div>
                      {contactLink(contact) && (
                        <a
                          href={contactLink(contact)}
                          target="_blank"
                          rel="noreferrer"
                          className="contact-btn"
                        >
                          {contactBtn(contact)}
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Требования */}
              <div className="supports-section">
                <h2 className="supports-section-title">
                  Системные требования
                </h2>
                <div className="requirements">
                  {requirements.length === 0 && (
                    <p className="supports-empty">Требований пока нет</p>
                  )}
                  {requirements.map((req) => (
                    <div key={req.documentId} className="req-item">
                      <span className="req-label">
                        {req.label || req.Label || "Параметр"}
                      </span>
                      <span className="req-value">
                        {req.value || req.Value || ""}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Полезные ссылки */}
              <div className="supports-section">
                <h2 className="supports-section-title">Полезные ссылки</h2>
                <div className="useful-links">
                  {links.length === 0 && (
                    <p className="supports-empty">Ссылок пока нет</p>
                  )}
                  {links.map((link) => (
                    <a
                      key={link.documentId}
                      href={link.url || link.Url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="useful-link"
                    >
                      {link.text || link.Text || "Ссылка"}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ===== TAB: Мои тикеты ===== */}
        {tab === "tickets" && (
          <div className="supports-section tickets-section">
            <h2 className="supports-section-title">Мои тикеты</h2>

            {ticketsLoading ? (
              <p className="supports-empty">Загрузка тикетов...</p>
            ) : tickets.length === 0 ? (
              <div className="tickets-empty">
                <p className="supports-empty">
                  У вас пока нет тикетов. Если нужна помощь — создайте новый тикет.
                </p>
                <button onClick={() => setTab("new")} className="ticket-submit">
                  Создать тикет
                </button>
              </div>
            ) : (
              <div className="tickets-list">
                {tickets.map((t) => {
                  const status = STATUS_LABELS[t.Status || "open"] || STATUS_LABELS.open;
                  const isActive = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      className={`ticket-row ${isActive ? "active" : ""}`}
                      onClick={() => setSelectedTicket(isActive ? null : t)}
                    >
                      <div className="ticket-row-main">
                        <span className="ticket-number">
                          {t.TicketNumber || t.id}
                        </span>
                        <span className="ticket-subject">{t.Subject}</span>
                      </div>
                      <div className="ticket-row-side">
                        <span className={`ticket-status-badge ${status.className}`}>
                          {status.label}
                        </span>
                        <span className="ticket-date">
                          {t.createdAt
                            ? new Date(t.createdAt).toLocaleDateString("ru-RU")
                            : ""}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Детали тикета */}
            {selectedTicket && (
              <div className="ticket-detail">
                <div className="ticket-detail-head">
                  <h3>
                    {selectedTicket.Subject}
                    <span className="ticket-number">
                      {selectedTicket.TicketNumber}
                    </span>
                  </h3>
                  <button
                    onClick={() => setSelectedTicket(null)}
                    className="ticket-close"
                  >
                    ×
                  </button>
                </div>
                <div className="ticket-detail-meta">
                  <span>
                    Категория:{" "}
                    {TICKET_CATEGORIES.find(
                      (c) => c.value === selectedTicket.Category
                    )?.label || selectedTicket.Category || "—"}
                  </span>
                  <span>
                    Приоритет:{" "}
                    {TICKET_PRIORITIES.find(
                      (p) => p.value === selectedTicket.Priority
                    )?.label || selectedTicket.Priority || "—"}
                  </span>
                  <span>
                    Создан:{" "}
                    {selectedTicket.createdAt
                      ? new Date(selectedTicket.createdAt).toLocaleString("ru-RU")
                      : "—"}
                  </span>
                </div>
                <div className="ticket-detail-message">
                  {selectedTicket.Message}
                </div>
                {selectedTicket.Response ? (
                  <div className="ticket-response">
                    <div className="ticket-response-head">
                      <Icon name="headset" size={18} /> Ответ поддержки
                      {selectedTicket.ResponseDate && (
                        <span className="ticket-date">
                          {new Date(selectedTicket.ResponseDate).toLocaleString("ru-RU")}
                        </span>
                      )}
                    </div>
                    <p>{selectedTicket.Response}</p>
                  </div>
                ) : (
                  <div className="ticket-waiting">
                    <Icon name="clock" size={16} /> Ожидайте ответа — уведомление придёт на{" "}
                    <b>{selectedTicket.ContactEmail || "вашу почту"}</b>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===== TAB: Новый тикет ===== */}
        {tab === "new" && (
          <div className="supports-section ticket-form-section">
            <h2 className="supports-section-title">Новый тикет</h2>
            <div className="ticket-form">
              <div className="ticket-form-field">
                <label>Тема обращения *</label>
                <input
                  type="text"
                  placeholder="Кратко опишите проблему"
                  value={ticketForm.Subject}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, Subject: e.target.value })
                  }
                  className="ticket-input"
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-field">
                  <label>Категория</label>
                  <select
                    value={ticketForm.Category}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, Category: e.target.value })
                    }
                    className="ticket-select"
                  >
                    {TICKET_CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="ticket-form-field">
                  <label>Приоритет</label>
                  <select
                    value={ticketForm.Priority}
                    onChange={(e) =>
                      setTicketForm({ ...ticketForm, Priority: e.target.value })
                    }
                    className="ticket-select"
                  >
                    {TICKET_PRIORITIES.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-field">
                <label>Email для ответа *</label>
                <input
                  type="email"
                  placeholder="you@example.com"
                  value={ticketForm.ContactEmail}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, ContactEmail: e.target.value })
                  }
                  className="ticket-input"
                />
              </div>

              <div className="ticket-form-field">
                <label>Описание проблемы *</label>
                <textarea
                  placeholder="Опишите проблему как можно подробнее: что произошло, когда и какие действия предшествовали"
                  value={ticketForm.Message}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, Message: e.target.value })
                  }
                  className="ticket-textarea"
                />
              </div>

              <button
                onClick={handleCreateTicket}
                disabled={
                  submitting ||
                  !ticketForm.Subject.trim() ||
                  !ticketForm.Message.trim() ||
                  !ticketForm.ContactEmail.trim()
                }
                className="ticket-submit"
              >
                {submitting ? "Отправка..." : "Отправить тикет"}
              </button>
              <p className="ticket-form-hint">
                Не нашли ответ? Посмотрите{" "}
                <Link href="/faq" className="ticket-hint-link">
                  страницу FAQ
                </Link>
                .
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
