import ratelimit from 'koa-ratelimit';

const db = new Map();

async function runLimiter(limiter: any, ctx: any, next: () => Promise<any>, fallbackMsg: string) {
  await limiter(ctx, next);
  if (ctx.status === 429 && typeof ctx.body === 'string') {
    ctx.type = 'application/json';
    ctx.body = {
      error: {
        status: 429,
        name: 'TooManyRequestsError',
        message: ctx.body || fallbackMsg,
      },
    };
  }
}

export default () => {
  const authLimiter = ratelimit({
    driver: 'memory',
    db,
    duration: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_AUTH_MAX) || 25,
    id: (ctx: any) => `auth:${ctx.ip}`,
    errorMessage: 'Слишком много попыток авторизации. Повторите через минуту.',
    disableHeader: false,
  });

  const walletWriteLimiter = ratelimit({
    driver: 'memory',
    db,
    duration: 60 * 1000,
    max: Number(process.env.RATE_LIMIT_WALLET_MAX) || 35,
    id: (ctx: any) => `wallet:${ctx.ip}`,
    errorMessage: 'Слишком много операций с кошельком. Повторите через минуту.',
    disableHeader: false,
  });

  return async (ctx: any, next: () => Promise<any>) => {
    if (ctx.path.startsWith('/api/auth/')) {
      return runLimiter(authLimiter, ctx, next, 'Слишком много попыток авторизации.');
    }
    if (ctx.path.startsWith('/api/wallets/') && ctx.method !== 'GET' && ctx.method !== 'HEAD') {
      return runLimiter(walletWriteLimiter, ctx, next, 'Слишком много операций с кошельком.');
    }
    return next();
  };
};
