import { ignoredDefenseSkip, isPreparing, preparation, rollModifiers, targetIgnoresDefense } from '../combat-modifiers.js';
import { skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** The target's DB. A flatfooted target has no Quickness DB (§9.5 Surprised or Flatfooted), nor one in frenzy (spec 040). */
export const CombatDefensiveBonusPlugin: CombatPlugin = {
  id: 'defensive-bonus',
  group: 'defense',
  rule: '§9.6',
  hooks: {
    prepare: [
      {
        condition: ctx => {
          if (!isPreparing(ctx)) return false;
          if (preparation(ctx).situationalModifiers.disabledDB) return skip('db-disabled');
          return targetIgnoresDefense(ctx) ? ignoredDefenseSkip(ctx) : true;
        },
        apply: ctx => void rollModifiers(ctx).add('bd', -preparation(ctx).bd, { bd: preparation(ctx).bd }),
      },
    ],
  },
};
