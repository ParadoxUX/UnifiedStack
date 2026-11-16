'use client';

import Link from 'next/link';

interface EmptyStateProps {
  title?: string;
  desc: string;
  linkText?: string;
  linkHref?: string;
}

export default function EmptyState({ title, desc, linkText, linkHref }: EmptyStateProps) {
  return (
    <div className="us-empty-state">
      <svg
        viewBox="0 0 120 120"
        width="88"
        height="88"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="us-empty-svg"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="emptyGrad" x1="20" y1="20" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#8B5CF6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#38BDF8" stopOpacity="0.8" />
          </linearGradient>
        </defs>
        <circle cx="60" cy="60" r="50" stroke="url(#emptyGrad)" strokeWidth="1.5" strokeDasharray="4 4" />
        <polygon points="60,28 88,44 88,76 60,92 32,76 32,44" stroke="url(#emptyGrad)" strokeWidth="2" fill="rgba(139, 92, 246, 0.06)" />
        <polyline points="32,44 60,60 88,44" stroke="url(#emptyGrad)" strokeWidth="1.8" />
        <line x1="60" y1="60" x2="60" y2="92" stroke="url(#emptyGrad)" strokeWidth="1.8" />
        <circle cx="60" cy="60" r="3" fill="#38BDF8" />
      </svg>

      {title && <h3 className="us-empty-title">{title}</h3>}
      <p className="us-empty-desc">{desc}</p>

      {linkText && linkHref && (
        <Link href={linkHref} className="btn-auth-launch">
          {linkText}
        </Link>
      )}
    </div>
  );
}
