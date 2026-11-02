import { isPreparing, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

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
