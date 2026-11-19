/**
 * support-ticket router
 *
 * create защищён rate limit (route-middleware выполняется после auth).
 */

import { factories } from '@strapi/strapi';

export default factories.createCoreRouter('api::support-ticket.support-ticket', {
  config: {
    create: {
      middlewares: ['global::support-ticket-rate-limit'],
    },
  },
});
