/**
 * game controller.
 */

import { factories } from '@strapi/strapi';
import { walletService } from '../../../services/wallet';

export default factories.createCoreController('api::game.game', ({ strapi }) => ({
  async buy(ctx: any) {
    const user = ctx.state.user;
    const { id } = ctx.params;
    const { reference } = ctx.request.body ?? {};

    try {
      const result = await walletService.purchaseGame(strapi, {
        userId: user.id,
        gameId: String(id),
        reference: reference || `purchase_${user.id}_${id}_${Date.now()}`,
      });
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.throw(400, err?.message || 'Ошибка покупки');
    }
  },

  async buyAddon(ctx: any) {
    const user = ctx.state.user;
    const { id, addonId } = ctx.params;
    const { reference } = ctx.request.body ?? {};

    try {
      const result = await walletService.purchaseAddon(strapi, {
        userId: user.id,
        addonId: String(addonId),
        reference:
          reference || `purchase_addon_${user.id}_${addonId}_${Date.now()}`,
      });
      ctx.body = { data: result };
    } catch (err: any) {
      ctx.throw(400, err?.message || 'Ошибка покупки дополнения');
    }
  },

  async library(ctx: any) {
    const user = ctx.state.user;
    const data = await walletService.getLibrary(strapi, user.id, true);
    ctx.body = { data };
  },
}));
