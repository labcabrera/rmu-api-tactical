import { isMelee, isPreparing, rollModifiers, targetIsFlatfooted } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const SURPRISE_BONUS = 25;
const REAR_BONUS = 35;

/**
 * Attacking a flatfooted foe (§9.5 Surprised or Flatfooted): the surprise bonus, and in melee the rear attack bonus
 * whatever the declared position. Its shield and Quickness DB are left out by the `shield` and `defensive-bonus`
 * plugins, and the `surprised-target` and `positional-target` ones step aside so the bonuses are not counted twice.
 */
export const CombatFlatfootedTargetPlugin: CombatPlugin = {
  id: 'flatfooted-target',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && targetIsFlatfooted(ctx),
        apply: ctx => {
          const modifiers = rollModifiers(ctx).add('flatfooted-target', SURPRISE_BONUS);
          if (isMelee(ctx)) {
            modifiers.add('flatfooted-rear', REAR_BONUS);
          }
        },
      },
    ],
  },
};
