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
      <path d="M3.5 8.2V19a1.8 1.8 0 0 0 1.8 1.8h13.4a1.8 1.8 0 0 0 1.8-1.8V8.2" />
      <path d="M2.5 8.2h19l-1.3-3.4a1.5 1.5 0 0 0-1.4-.95H5.2a1.5 1.5 0 0 0-1.4.95L2.5 8.2Z" />
      <path d="M9 12h6" />
    </>
  ),
  library: (
    <>
      <rect x="3.5" y="4" width="4" height="16" rx="1.2" />
      <rect x="10" y="4" width="4" height="16" rx="1.2" />
      <path d="m16.6 5.3 3.5.95a1.2 1.2 0 0 1 .85 1.47l-3.3 12.2a1.2 1.2 0 0 1-1.47.85l-3.5-.95" />
    </>
  ),
  sale: (
    <>
      <path d="M11.2 3.5H4.8a1.3 1.3 0 0 0-1.3 1.3v6.4a1.3 1.3 0 0 0 .38.92l8.4 8.4a1.3 1.3 0 0 0 1.84 0l6.4-6.4a1.3 1.3 0 0 0 0-1.84l-8.4-8.4a1.3 1.3 0 0 0-.92-.38Z" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" />
      <path d="m10.8 15 4.2-4.2" />
    </>
  ),
  cloud: (
    <>
      <path d="M7 19.5h10.5a4 4 0 0 0 .5-7.97A5.75 5.75 0 0 0 7 9.6a4.95 4.95 0 0 0 0 9.9Z" />
      <path d="M9.8 12.6 12 14.8l2.2-2.2" />
      <path d="M12 14.8V9.9" />
    </>
  ),
  community: (
    <>
      <circle cx="9.2" cy="8.2" r="3.1" />
      <path d="M3.4 19.2a5.9 5.9 0 0 1 11.6 0" />
      <circle cx="17" cy="9.2" r="2.4" />
      <path d="M16.2 14.6a4.4 4.4 0 0 1 4.4 4.4" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M19.3 14.6a1.6 1.6 0 0 0 .32 1.76l.06.06a1.94 1.94 0 1 1-2.74 2.74l-.06-.06a1.6 1.6 0 0 0-1.76-.32 1.6 1.6 0 0 0-.97 1.46v.18a1.94 1.94 0 1 1-3.88 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.76.32l-.06.06a1.94 1.94 0 1 1-2.74-2.74l.06-.06a1.6 1.6 0 0 0 .32-1.76 1.6 1.6 0 0 0-1.46-.97h-.18a1.94 1.94 0 1 1 0-3.88h.1A1.6 1.6 0 0 0 4.7 8.6a1.6 1.6 0 0 0-.32-1.76l-.06-.06A1.94 1.94 0 1 1 7.06 4.04l.06.06a1.6 1.6 0 0 0 1.76.32h.08a1.6 1.6 0 0 0 .97-1.46v-.18a1.94 1.94 0 1 1 3.88 0v.1a1.6 1.6 0 0 0 .97 1.46 1.6 1.6 0 0 0 1.76-.32l.06-.06a1.94 1.94 0 1 1 2.74 2.74l-.06.06a1.6 1.6 0 0 0-.32 1.76v.08a1.6 1.6 0 0 0 1.46.97h.18a1.94 1.94 0 1 1 0 3.88h-.1a1.6 1.6 0 0 0-1.46.97Z" />
    </>
  ),
  support: (
    <>
      <path d="M4 14v-2a8 8 0 0 1 16 0v2" />
      <rect x="2.6" y="13" width="4" height="6.2" rx="1.9" />
      <rect x="17.4" y="13" width="4" height="6.2" rx="1.9" />
      <path d="M20.5 18.5v.6a3.4 3.4 0 0 1-3.4 3.4h-3.2" />
      <circle cx="12.6" cy="22.5" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  faq: (
    <>
      <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="4.2" />
      <path d="M9.6 9.4a2.5 2.5 0 0 1 4.86.82c0 1.7-2.46 2.1-2.46 3.78" />
      <circle cx="12" cy="17.2" r="1.15" fill="currentColor" stroke="none" />
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
      <path d="M3.4 7.6A2.4 2.4 0 0 1 5.8 5.2h11.6a1.6 1.6 0 0 1 1.6 1.6v1.4" />
      <rect x="3.4" y="7.6" width="17.2" height="12.4" rx="2.4" />
      <path d="M20.6 12.2h-4.2a2.3 2.3 0 0 0 0 4.6h4.2" />
      <circle cx="16.6" cy="14.5" r="0.9" fill="currentColor" stroke="none" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M9.4 9.3a2.7 2.7 0 0 1 5.25.85c0 1.8-2.65 2.2-2.65 4" />
      <circle cx="12" cy="17.3" r="1.1" fill="currentColor" stroke="none" />
    </>
  ),
  headset: (
    <>
      <path d="M4.4 13.4v-1.6a7.6 7.6 0 0 1 15.2 0v1.6" />
      <rect x="3" y="12.6" width="3.2" height="5.4" rx="1.6" />
      <rect x="17.8" y="12.6" width="3.2" height="5.4" rx="1.6" />
      <path d="M19.4 18v.4a2.6 2.6 0 0 1-2.6 2.6h-2.4" />
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
      className={`us-icon icon-svg ${className}`.trim()}
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
