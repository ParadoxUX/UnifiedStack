/**
 * game-addon controller
 *
 * Стандартный CRUD Strapi. Дополнительно — список дополнений конкретной игры.
 */

import { factories } from '@strapi/strapi';
import { walletService } from '../../../services/wallet';

const UID: any = 'api::game-addon.game-addon';

export default factories.createCoreController(UID, ({ strapi }) => ({
  async buy(ctx: any) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const { reference } = ctx.request.body ?? {};

    try {
      const result = await walletService.purchaseAddon(strapi, {
        userId: user.id,
        addonId: String(id),
        reference: reference || `purchase_addon_${user.id}_${id}_${Date.now()}`,
      });
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.throw(400, err?.message || 'Ошибка покупки дополнения');
    }
  },

  async findByGame(ctx: any) {
    const { gameId } = ctx.params;
    const addons = await strapi.db.query(UID).findMany({
      where: { game: { $or: [{ documentId: gameId }, { id: Number(gameId) || -1 }] } },
      populate: ['Cover'],
      orderBy: [{ position: 'asc' }, { Price: 'asc' }],
    });

    ctx.body = { data: addons };
  },
}));
