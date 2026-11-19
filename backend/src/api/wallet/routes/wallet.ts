/**
 * wallet router — маршруты кошелька (авторизация проверяется в контроллере
 * через ctx.state.user и middleware global::wallet-auth).
 * Публичный /wallets/deposit закрыт (T-03): пополнение идёт только через /api/payments/webhook.
 */

const base = { auth: false };

export default {
  routes: [
    { method: 'GET', path: '/wallets/me', handler: 'wallet.me', config: base },
    { method: 'GET', path: '/wallets/library', handler: 'wallet.library', config: base },
    { method: 'POST', path: '/wallets/withdraw', handler: 'wallet.withdraw', config: base },
    { method: 'POST', path: '/wallets/purchase', handler: 'wallet.purchase', config: base },
    { method: 'POST', path: '/wallets/reverse', handler: 'wallet.reverse', config: base },
  ],
};
