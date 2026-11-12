"use client";

import { useState, useEffect } from "react";
import { fetchFaqs } from "@/lib/strapi";
import { showToast } from "@/lib/toast";
import Link from "next/link";

export default function FaqPage() {
  const [faqs, setFaqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    fetchFaqs()
      .then((data) => setFaqs(data))
      .catch((err) => {
        console.error("[faq] Ошибка загрузки:", err);
        showToast("Не удалось загрузить FAQ", "error");
      })
      .finally(() => setLoading(false));
  }, []);

  const filtered = faqs.filter((f) => {
    const q = f.question || f.Question || "";
    const a = f.answer || f.Answer || "";
    const s = search.toLowerCase();
    return q.toLowerCase().includes(s) || a.toLowerCase().includes(s);
  });

  if (loading) {
    return <div className="supports-page">Загрузка FAQ...</div>;
  }

  return (
    <div className="supports-page">
      <div className="supports-container">
        <h1 className="supports-title">Часто задаваемые вопросы</h1>
        <p className="supports-subtitle">
          Быстрые ответы на самые популярные вопросы об Ampligame
        </p>

        <div className="supports-search">
          <input
            type="text"
            placeholder="Поиск по вопросам и ответам..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="supports-search-input"
          />
          <button onClick={() => setOpenFaq(null)} className="supports-search-btn">
            Найти
          </button>
        </div>

        <div className="supports-section faq-page-section">
          <div className="faq-list">
            {filtered.length === 0 && (
              <p className="supports-empty">
                {search
                  ? `Ничего не найдено по запросу «${search}». Попробуйте иначе или создайте тикет в поддержке.`
                  : "Вопросов пока нет"}
              </p>
            )}
            {filtered.map((faq) => {
              const id = faq.documentId;
              const isOpen = openFaq === id;
              return (
                <div key={id} className={`faq-item ${isOpen ? "active" : ""}`}>
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

        <div className="faq-cta">
          <p>Не нашли ответ на свой вопрос?</p>
          <Link href="/supports" className="faq-cta-btn">
            Создать тикет в поддержку
          </Link>
        </div>
      </div>
    </div>
  );
}
