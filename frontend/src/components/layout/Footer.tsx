'use client';

import Link from 'next/link';
import Icon from '@/components/ui/Icon';

export default function Footer() {
  return (
    <footer className="us-footer pv-footer">
      <div className="pv-footer-grid">
        <div>
          <Link href="/" className="pv-topbar-brand">
            <span className="pv-brand-mark">
              <Icon name="logo" size={18} />
            </span>
            <span>UNIFIEDSTACK</span>
          </Link>
          <p className="pv-footer-desc">
            Цифровая игровая платформа: 59+ игр с актуальными ценами, дополнения, облачный ПК-клуб и комьюнити.
          </p>
        </div>

        <div className="pv-footer-col">
          <h4>Платформа</h4>
          <ul>
            <li><Link href="/store">Каталог игр</Link></li>
            <li><Link href="/sale">Скидки и акции</Link></li>
            <li><Link href="/cloud">Облачный ПК-клуб</Link></li>
            <li><Link href="/library">Моя библиотека</Link></li>
          </ul>
        </div>

        <div className="pv-footer-col">
          <h4>Сообщество</h4>
          <ul>
            <li><Link href="/forums">Форумы</Link></li>
            <li><Link href="/groups">Группы</Link></li>
            <li><Link href="/events">События</Link></li>
            <li><Link href="/friends">Друзья</Link></li>
          </ul>
        </div>

        <div className="pv-footer-col">
          <h4>Поддержка</h4>
          <ul>
            <li><Link href="/supports">Служба поддержки</Link></li>
            <li><Link href="/faq">Частые вопросы (FAQ)</Link></li>
            <li><Link href="/settings">Настройки</Link></li>
            <li><Link href="/profile">Профиль</Link></li>
          </ul>
        </div>
      </div>

      <div className="pv-footer-bottom">
        <span>© {new Date().getFullYear()} UnifiedStack. Все права защищены.</span>
        <span>Steam-каталог • Защищённый кошелёк • Облачный гейминг</span>
      </div>
    </footer>
  );
}
