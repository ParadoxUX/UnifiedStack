"use client";

import React from "react";

export type IconName =
  | "logo"
  | "store"
  | "library"
  | "sale"
  | "cloud"
  | "community"
  | "settings"
  | "support"
  | "faq"
  | "chevron"
  | "menu"
  | "close"
  | "chat"
  | "tools"
  | "trophy"
  | "gamepad"
  | "user"
  | "users"
  | "fire"
  | "ticket"
  | "edit"
  | "clock"
  | "eye"
  | "plus"
  | "heart"
  | "wallet"
  | "help"
  | "headset";

const ICONS: Record<IconName, React.ReactNode> = {
  logo: (
    <>
      <polygon points="12 2 21 7 21 17 12 22 3 17 3 7 12 2" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <polyline points="7.5 10 12 12.5 16.5 10" stroke="currentColor" strokeWidth="1.8" fill="none" />
      <line x1="12" y1="12.5" x2="12" y2="17.5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="7" r="1.5" fill="currentColor" />
    </>
  ),
  store: (
    <>
      <path d="M4 7h16l-1.2 11.2a2 2 0 0 1-2 1.8H7.2a2 2 0 0 1-2-1.8L4 7Z" />
      <path d="M8 7V5a4 4 0 0 1 8 0v2" />
      <path d="M9.5 12h5" />
    </>
  ),
  library: (
    <>
      <rect x="4" y="4" width="4" height="16" rx="1" />
      <rect x="10" y="4" width="4" height="16" rx="1" />
      <path d="M16.2 4.5l3.8 14.8-3.6.9-3.8-14.8 3.6-.9Z" />
    </>
  ),
  sale: (
    <>
      <path d="M3 11.5V4h7.5l9.8 9.8a1.5 1.5 0 0 1 0 2.1l-4.4 4.4a1.5 1.5 0 0 1-2.1 0L3 11.5Z" />
      <circle cx="7.5" cy="7.5" r="1.3" fill="currentColor" stroke="none" />
      <path d="M10.5 14.5l4-4" />
    </>
  ),
  cloud: (
    <>
      <path d="M6.5 19h11a4.5 4.5 0 0 0 .8-8.9A6 6 0 0 0 6.8 8.3 4.5 4.5 0 0 0 6.5 19Z" />
      <path d="M12 11v5m0 0l-2-2m2 2l2-2" />
    </>
  ),
  community: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3.5 19c0-2.8 2.4-4.5 5.5-4.5s5.5 1.7 5.5 4.5" />
      <circle cx="16.5" cy="9" r="2.2" />
      <path d="M16.5 14c2.2 0 4 1.2 4 3.5" />
    </>
  ),
  settings: (
    <>
      <polygon points="12 3 19.8 7.5 19.8 16.5 12 21 4.2 16.5 4.2 7.5 12 3" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  support: (
    <>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="3" y="12" width="3.5" height="6" rx="1.5" />
      <rect x="17.5" y="12" width="3.5" height="6" rx="1.5" />
      <path d="M21 17v1a3 3 0 0 1-3 3h-4" />
    </>
  ),
  faq: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="4" />
      <path d="M9.5 9.2a2.6 2.6 0 0 1 5 .8c0 1.8-2.5 2.2-2.5 3.8" />
      <circle cx="12" cy="17" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  chevron: <polyline points="6 9 12 15 18 9" />,
  menu: (
    <>
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="16" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </>
  ),
  close: (
    <>
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </>
  ),
  chat: (
    <>
      <path d="M4 5h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H8l-4 4V6a1 1 0 0 1 1-1Z" />
      <line x1="8" y1="9.5" x2="16" y2="9.5" />
      <line x1="8" y1="13" x2="13" y2="13" />
    </>
  ),
  tools: (
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </>
  ),
  trophy: (
    <>
      <path d="M7 4h10v5a5 5 0 0 1-10 0V4Z" />
      <path d="M7 6H4v2a3 3 0 0 0 3 3" />
      <path d="M17 6h3v2a3 3 0 0 1-3 3" />
      <line x1="12" y1="14" x2="12" y2="19" />
      <line x1="8" y1="19" x2="16" y2="19" />
    </>
  ),
  gamepad: (
    <>
      <rect x="2" y="6" width="20" height="12" rx="4" />
      <line x1="6" y1="12" x2="10" y2="12" />
      <line x1="8" y1="10" x2="8" y2="14" />
      <circle cx="15.5" cy="10.5" r="1" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 20c0-3.5 3.1-6 7-6s7 2.5 7 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M3 19.5c0-3 2.7-5 6-5s6 2 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M17 14.5c2.3 0 4 1.3 4 4" />
    </>
  ),
  fire: (
    <path d="M12 2.5c2.5 3.2 6.5 6.3 6.5 11.2a6.5 6.5 0 1 1-13 0c0-2.4 1.2-4.6 2.8-6.2-.2 1.8.8 3.2 2.2 3.2 1.4 0 2.2-1.2 1.9-3.1-.3-1.7-.7-3.4-.4-5.1Z" />
  ),
  ticket: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4V7Z" />
      <line x1="10" y1="5" x2="10" y2="19" strokeDasharray="2 2" />
    </>
  ),
  edit: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 7 12 12 15.5 14" />
    </>
  ),
  eye: (
    <>
      <path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  plus: (
    <>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </>
  ),
  heart: (
    <path d="M12 20.5S3.5 15 3.5 8.8A4.8 4.8 0 0 1 12 5.9a4.8 4.8 0 0 1 8.5 2.9c0 6.2-8.5 11.7-8.5 11.7Z" />
  ),
  wallet: (
    <>
      <rect x="2.5" y="6" width="19" height="13" rx="2.5" />
      <path d="M2.5 10h19" />
      <circle cx="17" cy="14.5" r="1.4" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.2a2.6 2.6 0 1 1 3.6 2.4c-.7.3-1.1.9-1.1 1.7v.4" />
      <line x1="12" y1="17" x2="12" y2="17.01" />
    </>
  ),
  headset: (
    <>
      <path d="M4 13v-1a8 8 0 0 1 16 0v1" />
      <rect x="2.5" y="13" width="4" height="6" rx="1.6" />
      <rect x="17.5" y="13" width="4" height="6" rx="1.6" />
      <path d="M20 19v.5a2.5 2.5 0 0 1-2.5 2.5H13" />
    </>
  ),
};

export default function Icon({
  name,
  size = 20,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`us-icon ${className}`.trim()}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
