'use client';

import { useState, useEffect } from 'react';
import { login, register } from '@/lib/auth';
import Icon from '@/components/ui/Icon';
import { showToast } from '@/lib/toast';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function AuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      const result =
        mode === 'register'
          ? await register(email, username, password)
          : await login(email, password);

      if (result.success && result.user) {
        showToast(
          mode === 'register'
            ? `Добро пожаловать в UnifiedStack, ${result.user.username}!`
            : `С возвращением, ${result.user.username}!`,
          'success'
        );
        onSuccess();
      } else {
        setError(result?.error || 'Не удалось выполнить запрос');
      }
    } catch {
      setError('Ошибка соединения с сервером');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="us-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="us-auth-card">
        <button type="button" className="us-modal-close" onClick={onClose} aria-label="Закрыть">
          <Icon name="close" size={18} />
        </button>

        {/* Шапка с эмблемой Сатурн */}
        <div className="us-auth-brand">
          <div className="us-auth-logo-glow">
            <Icon name="logo" size={38} />
          </div>
          <h2 className="us-auth-heading">
            {mode === 'login' ? 'Вход в UnifiedStack' : 'Создать аккаунт'}
          </h2>
          <p className="us-auth-sub">
            {mode === 'login'
              ? 'Единый профиль для библиотеки игр, облака и кошелька'
              : 'Регистрация займёт пару секунд — сразу откроется кошелёк и витрина'}
          </p>
        </div>

        {/* Переключатель Вход / Регистрация */}
        <div className="us-auth-switch">
          <button
            type="button"
            className={`us-auth-switch-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => {
              setMode('login');
              setError('');
            }}
          >
            Вход
          </button>
          <button
            type="button"
            className={`us-auth-switch-btn ${mode === 'register' ? 'active' : ''}`}
            onClick={() => {
              setMode('register');
              setError('');
            }}
          >
            Регистрация
          </button>
        </div>

        <form className="us-auth-form" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="us-auth-field">
              <label>Никнейм</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Например: Paradox_UX"
                autoComplete="username"
                required
              />
            </div>
          )}

          <div className="us-auth-field">
            <label>{mode === 'login' ? 'Email или никнейм' : 'Электронная почта'}</label>
            <input
              type={mode === 'register' ? 'email' : 'text'}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={mode === 'register' ? 'player@mail.ru' : 'player@mail.ru или Paradox_UX'}
              autoComplete="email"
              required
            />
          </div>

          <div className="us-auth-field">
            <label>Пароль</label>
            <div className="us-auth-pass-wrap">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Минимум 6 символов"
                autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                required
              />
              <button
                type="button"
                className="us-auth-eye"
                onClick={() => setShowPass(!showPass)}
                tabIndex={-1}
              >
                {showPass ? 'Скрыть' : 'Показать'}
              </button>
            </div>
          </div>

          {error && <div className="us-auth-error">{error}</div>}

          <button type="submit" className="btn-auth-launch us-auth-submit-btn" disabled={loading}>
            {loading
              ? 'Подключение...'
              : mode === 'login'
              ? 'Войти в аккаунт'
              : 'Зарегистрироваться'}
          </button>
        </form>
      </div>
    </div>
  );
}
