import { isPreparing, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatGameLethalityPlugin: CombatPlugin = {
  id: 'game-lethality',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && (ctx.gameLethality || 0) > 0,
        apply: ctx => void rollModifiers(ctx).add('game-lethality', ctx.gameLethality!),
      },
    ],
  },
};
