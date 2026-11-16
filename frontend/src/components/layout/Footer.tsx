'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export default function Footer() {
  return (
    <footer className="us-footer">
      <div className="us-footer-brand">
        <Icon name="logo" size={22} />
        <span>UNIFIED STACK</span>
      </div>

      <nav className="us-footer-links">
        <Link href="/store">Каталог</Link>
        <Link href="/cloud">Облачный гейминг</Link>
        <Link href="/faq">FAQ</Link>
        <Link href="/supports">Поддержка</Link>
      </nav>

      <p className="us-footer-copy">© {new Date().getFullYear()} UnifiedStack. Цифровая игровая платформа.</p>
    </footer>
  );
}
