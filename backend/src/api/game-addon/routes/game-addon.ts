/**
 * game-addon router
 */

import { factories } from '@strapi/strapi';

const UID: any = 'api::game-addon.game-addon';

export default factories.createCoreRouter(UID, {
  only: ['find', 'findOne'],
  config: {
    find: { auth: false, policies: [] },
    findOne: { auth: false, policies: [] },
  },
});
