import { isMelee, isPreparing, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const TWO_HANDED_BONUS = 10;

/** A melee weapon wielded with both hands (Table 9-5): the mode comes from the strategic sheet. */
export const CombatTwoHandedWeaponPlugin: CombatPlugin = {
  id: 'two-handed-weapon',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && isMelee(ctx) && !!ctx.sourceAttack?.twoHanded,
        apply: ctx => void rollModifiers(ctx).add('two-handed-weapon', TWO_HANDED_BONUS),
      },
    ],
  },
};
