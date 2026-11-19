/**
 * Публичный роутер платежного webhook.
 *
 * auth: false — вызов приходит от платёжного провайдера, а не от пользователя.
 * Доступ контролируется подписью HMAC и idempotency key в контроллере.
 */

export default {
  routes: [
    {
      method: 'POST',
      path: '/payments/webhook',
      handler: 'payment.webhook',
      config: { auth: false },
    },
  ],
};
