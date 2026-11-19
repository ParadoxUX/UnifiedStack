'use client';

import { useState } from 'react';

export default function ProductDescription({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);

  const paragraphs = String(text || 'Описание отсутствует')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="pv-desc-box">
      <div className={`pv-desc-content ${expanded ? 'is-expanded' : ''}`}>
        {paragraphs.map((p, idx) => (
          <p key={idx}>{p}</p>
        ))}
        {!expanded && <div className="pv-desc-fade" aria-hidden="true" />}
      </div>

      <div className="pv-desc-footer">
        <button
          type="button"
          className="pv-desc-toggle"
          onClick={() => setExpanded((v) => !v)}
        >
          {expanded ? 'Свернуть описание' : 'Показать полностью'}
        </button>
        <div className="pv-desc-pills">
          <span>Лицензия PC</span>
          <span>Облачные сохранения</span>
          <span>Достижения</span>
        </div>
      </div>
    </div>
  );
}
