'use client';

import { useState } from 'react';
import { showToast } from '@/lib/toast';
import { deposit } from '@/lib/wallet';
import Icon from '@/components/ui/Icon';

type PayMethod = 'card' | 'sbp' | 'crypto';

export default function BalanceModal({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState('1000');
  const [method, setMethod] = useState<PayMethod>('card');
  const [cardNumber, setCardNumber] = useState('2200 7004 •••• 4819');
  const [busy, setBusy] = useState(false);

  const presets = [500, 1000, 2000, 3500, 5000, 10000];

  const handlePay = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseInt(amount, 10);
    if (!Number.isInteger(val) || val <= 0) {
      showToast('Укажите корректную сумму пополнения', 'error');
      return;
    }
    if (busy) return;
    setBusy(true);
    try {
      const ref = `pay_${method}_${Date.now()}`;
      const wallet = await deposit(val, ref);
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('us:wallet-updated', { detail: { balance: wallet.balance } }));
      }
      showToast(`Платёж выполнен! Зачислено +${val} ₽ (Баланс: ${wallet.balance} ₽)`, 'success');
      onSuccess();
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Ошибка проведения платежа. Проверьте авторизацию.', 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="us-modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="us-pay-modal">
        <div className="us-pay-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Icon name="wallet" size={22} />
            <h3>Пополнение кошелька UnifiedStack</h3>
          </div>
          <button type="button" className="us-modal-close" onClick={onClose} aria-label="Закрыть">
            <Icon name="close" size={18} />
          </button>
        </div>

        <form onSubmit={handlePay} className="us-pay-body">
          <label className="us-pay-label">1. Выберите способ оплаты</label>
          <div className="us-pay-methods">
            <button
              type="button"
              className={`us-pay-method ${method === 'card' ? 'active' : ''}`}
              onClick={() => setMethod('card')}
            >
              Банковская карта
            </button>
            <button
              type="button"
              className={`us-pay-method ${method === 'sbp' ? 'active' : ''}`}
              onClick={() => setMethod('sbp')}
            >
              СБП (Мгновенно)
            </button>
            <button
              type="button"
              className={`us-pay-method ${method === 'crypto' ? 'active' : ''}`}
              onClick={() => setMethod('crypto')}
            >
              USDT / TON
            </button>
          </div>

          {method === 'card' && (
            <div className="us-pay-card-box">
              <input
                type="text"
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value)}
                placeholder="Номер карты"
                className="us-pay-input"
              />
              <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                <input type="text" defaultValue="09/29" placeholder="ММ/ГГ" className="us-pay-input" style={{ width: '50%' }} />
                <input type="password" defaultValue="777" maxLength={3} placeholder="CVC" className="us-pay-input" style={{ width: '50%' }} />
              </div>
            </div>
          )}

          {method === 'sbp' && (
            <div className="us-pay-info-box">
              Перевод по Системе Быстрых Платежей без комиссии. Зачисление в течение 1 секунды.
            </div>
          )}

          {method === 'crypto' && (
            <div className="us-pay-info-box">
              Автоматическая конвертация по курсу ЦБ РФ без скрытых сборов.
            </div>
          )}

          <label className="us-pay-label" style={{ marginTop: '16px' }}>2. Сумма пополнения (₽)</label>
          <div className="us-pay-presets">
            {presets.map((p) => (
              <button
                key={p}
                type="button"
                className={`us-pay-preset ${Number(amount) === p ? 'active' : ''}`}
                onClick={() => setAmount(String(p))}
              >
                {p} ₽
              </button>
            ))}
          </div>

          <div className="us-pay-custom-row">
            <input
              type="number"
              min={10}
              step={1}
              placeholder="Другая сумма"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="us-pay-input"
            />
            <button type="submit" disabled={busy} className="btn-auth-launch" style={{ minWidth: '160px', justifyContent: 'center' }}>
              {busy ? 'Проведение...' : `Оплатить ${amount || 0} ₽`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
