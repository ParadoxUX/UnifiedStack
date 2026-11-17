/**
 * game-addon controller
 *
 * Каталог дополнений читается публично: GET /api/game-addons/by-game/:gameId.
 */

import { factories } from '@strapi/strapi';

const UID: any = 'api::game-addon.game-addon';

export default factories.createCoreController(UID, ({ strapi }) => ({
  async findByGame(ctx: any) {
    const { gameId } = ctx.params;
    const where: any = {
      game: { $or: [{ documentId: gameId }, { id: Number(gameId) || -1 }] },
    };

    let addons = await strapi.db.query(UID).findMany({
      where,
      populate: ['Cover'],
      orderBy: [{ position: 'asc' }, { Price: 'asc' }],
    });

    // Лигированные на чтение записи могут отфильтроваться — пробуем без populate.
    if (!addons.length) {
      addons = await strapi.db.query(UID).findMany({
        where,
        orderBy: [{ position: 'asc' }, { Price: 'asc' }],
      });
    }

    ctx.body = { data: addons };
  },
}));
