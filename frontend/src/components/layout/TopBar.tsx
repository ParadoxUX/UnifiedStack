'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { getCurrentUser, logout, User } from '@/lib/auth';
import { getItem } from '@/lib/storage';
import { fetchWallet } from '@/lib/wallet';
import { applyCosmetics } from '@/lib/cosmetics';
import { useLang } from '@/lib/i18n';
import Icon from '@/components/ui/Icon';
import AuthModal from '@/components/auth/AuthModal';
import BalanceModal from '@/components/balance/BalanceModal';

const STATUS_COLORS: Record<string, string> = {
  online: '#22c55e',
  away: '#f59e0b',
  dnd: '#ef4444',
  invisible: '#64748b',
};

export default function TopBar() {
  const { t } = useLang();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [avatar, setAvatar] = useState('/img/default-avatar.svg');
  const [status, setStatus] = useState('online');
  const [showAuth, setShowAuth] = useState(false);
  const [showBalance, setShowBalance] = useState(false);

  const refresh = useCallback(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    if (currentUser) {
      fetchWallet()
        .then((w) => setBalance(w.balance))
        .catch(() => setBalance(0));
    } else {
      setBalance(0);
    }
    setAvatar(getItem('user_avatar') || '/img/default-avatar.svg');
    setStatus(getItem('user_status') || 'online');
  }, []);

  useEffect(() => {
    setMounted(true);
    refresh();
    applyCosmetics();

    const params = new URLSearchParams(window.location.search);
    if (params.get('auth') === 'required' && !getCurrentUser()) {
      setShowAuth(true);
    }

    const onWalletUpdated = (e: Event) => {
      const detail = (e as CustomEvent<{ balance?: number }>).detail;
      if (typeof detail?.balance === 'number') {
        setBalance(detail.balance);
      } else {
        refresh();
      }
    };

    window.addEventListener('focus', refresh);
    window.addEventListener('storage', refresh);
    window.addEventListener('us:auth-changed', refresh);
    window.addEventListener('us:wallet-updated', onWalletUpdated);
    return () => {
      window.removeEventListener('focus', refresh);
      window.removeEventListener('storage', refresh);
      window.removeEventListener('us:auth-changed', refresh);
      window.removeEventListener('us:wallet-updated', onWalletUpdated);
    };
  }, [refresh]);

  const handleLogout = async () => {
    await logout();
    setUser(null);
    window.location.href = '/';
  };

  const handleAuthSuccess = () => {
    setShowAuth(false);
    refresh();
    const next = new URLSearchParams(window.location.search).get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      window.location.href = next;
    } else {
      window.location.reload();
    }
  };

  if (!mounted) return null;

  const navItems = [
    { href: '/', label: t('store'), active: pathname === '/' },
    { href: '/store', label: 'Каталог', active: pathname.startsWith('/store') },
    { href: '/sale', label: t('sale'), active: pathname === '/sale' },
    { href: '/cloud', label: t('cloud'), active: pathname === '/cloud' },
    { href: '/forums', label: t('community'), active: pathname.startsWith('/forums') || pathname === '/groups' || pathname === '/events' },
    { href: '/library', label: t('library'), active: pathname === '/library' },
  ];

  return (
    <>
      <header className="topbar-hud pv-topbar">
        <Link href="/" className="pv-topbar-brand">
          <span className="pv-brand-mark">
            <Icon name="logo" size={20} />
          </span>
          <span>UNIFIEDSTACK</span>
        </Link>

        <nav className="pv-topbar-nav" aria-label="Основная навигация">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`pv-topbar-link ${item.active ? 'is-active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="pv-topbar-right">
          {user ? (
            <>
              <div className="balance-pill">
                <span className="balance-caption">{t('balance')}</span>
                <span className="balance-value">{balance.toLocaleString('ru-RU')} ₽</span>
                <button
                  type="button"
                  className="btn-topup"
                  onClick={() => setShowBalance(true)}
                  title={t('top_up')}
                >
                  <Icon name="plus" size={14} />
                  <span>{t('top_up')}</span>
                </button>
              </div>

              <Link href="/profile" className="topbar-avatar-link" title={user.username || 'Профиль'}>
                <img src={avatar} alt="Avatar" className="topbar-avatar-img" />
                <span
                  className="topbar-status-dot"
                  style={{ backgroundColor: STATUS_COLORS[status] || STATUS_COLORS.online }}
                />
              </Link>

              <button
                type="button"
                className="btn-logout-icon"
                onClick={handleLogout}
                title={t('logout')}
                aria-label={t('logout')}
              >
                <Icon name="close" size={16} />
              </button>
            </>
          ) : (
            <button type="button" className="btn-auth-launch" onClick={() => setShowAuth(true)}>
              <Icon name="user" size={16} />
              <span>{t('login')}</span>
            </button>
          )}
        </div>
      </header>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onSuccess={handleAuthSuccess} />}
      {showBalance && <BalanceModal onClose={() => setShowBalance(false)} onSuccess={refresh} />}
    </>
  );
}
