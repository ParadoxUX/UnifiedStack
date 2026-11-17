/**
 * game-addon router
 */

import { factories } from '@strapi/strapi';

const UID: any = 'api::game-addon.game-addon';

const addonCoreRouter: any = factories.createCoreRouter(UID);

const addonCoreRoutes: any[] =
  typeof addonCoreRouter === 'function' ? addonCoreRouter() : addonCoreRouter.routes;

export default {
  routes: [
    ...addonCoreRoutes,
    {
      method: 'POST',
      path: '/game-addons/:id/buy',
      handler: 'game-addon.buy',
      config: { policies: [] },
    },
    {
      method: 'GET',
      path: '/game-addons/by-game/:gameId',
      handler: 'game-addon.findByGame',
      config: { policies: [] },
    },
  ],
};
