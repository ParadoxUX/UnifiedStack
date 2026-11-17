/**
 * game router.
 */

import { factories } from '@strapi/strapi';

const gameCoreRouter: any = factories.createCoreRouter('api::game.game');

const gameCoreRoutes: any[] =
  typeof gameCoreRouter === 'function' ? gameCoreRouter() : gameCoreRouter.routes;

export default {
  routes: [
    ...gameCoreRoutes,
    {
      method: 'POST',
      path: '/games/:id/buy',
      handler: 'game.buy',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/games/:id/library',
      handler: 'game.library',
      config: { policies: [] },
    },
  ],
};
