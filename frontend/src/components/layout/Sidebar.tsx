'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/i18n';
import Icon from '@/components/ui/Icon';

export default function Sidebar() {
  const pathname = usePathname();
  const { t } = useLang();
  const [communityOpen, setCommunityOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setCommunityOpen(false);
  }, [pathname]);

  const isActive = (path: string) => pathname === path;

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Меню"
      >
        <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
      </button>

      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(5, 4, 12, 0.78)',
            backdropFilter: 'blur(4px)',
            zIndex: 998,
          }}
        />
      )}

      <nav className={`sidebar pv-sidebar ${mobileOpen ? 'mobile-open' : ''}`}>
        <ul>
          <li className={`sidebar-btn ${isActive('/') || isActive('/store') ? 'active' : ''}`}>
            <Link href="/store">
              <Icon name="store" size={20} className="icon" />
              <span>{t('store')}</span>
            </Link>
          </li>

          <li className={`sidebar-btn ${isActive('/library') ? 'active' : ''}`}>
            <Link href="/library">
              <Icon name="library" size={20} className="icon" />
              <span>{t('library')}</span>
            </Link>
          </li>

          <li className={`sidebar-btn ${isActive('/sale') ? 'active' : ''}`}>
            <Link href="/sale">
              <Icon name="sale" size={20} className="icon" />
              <span>{t('sale')}</span>
            </Link>
          </li>

          <li className={`sidebar-btn ${isActive('/cloud') ? 'active' : ''}`}>
            <Link href="/cloud">
              <Icon name="cloud" size={20} className="icon" />
              <span>{t('cloud')}</span>
            </Link>
          </li>

          <li className={`sidebar-btn has-dropdown ${communityOpen ? 'active' : ''}`}>
            <a
              href="#"
              className="dropdown-toggle"
              onClick={(e) => {
                e.preventDefault();
                setCommunityOpen(!communityOpen);
              }}
            >
              <Icon name="community" size={20} className="icon" />
              <span>{t('community')}</span>
            </a>
            <ul className={`dropdown-menu ${communityOpen ? 'active' : ''}`}>
              <li><Link href="/profile" className="dropdown-link">{t('profile')}</Link></li>
              <li><Link href="/friends" className="dropdown-link">{t('friends')}</Link></li>
              <li><Link href="/groups" className="dropdown-link">{t('groups')}</Link></li>
              <li><Link href="/forums" className="dropdown-link">{t('forums')}</Link></li>
              <li><Link href="/events" className="dropdown-link">{t('events')}</Link></li>
            </ul>
          </li>

          <li className={`sidebar-btn bottom ${isActive('/settings') ? 'active' : ''}`}>
            <Link href="/settings">
              <Icon name="settings" size={19} className="icon" />
              <span>{t('settings')}</span>
            </Link>
          </li>

          <li className={`sidebar-btn ${isActive('/supports') ? 'active' : ''}`}>
            <Link href="/supports">
              <Icon name="support" size={19} className="icon" />
              <span>{t('supports')}</span>
            </Link>
          </li>

          <li className={`sidebar-btn ${isActive('/faq') ? 'active' : ''}`}>
            <Link href="/faq">
              <Icon name="faq" size={19} className="icon" />
              <span>FAQ</span>
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
}
