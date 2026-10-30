import { rollModifiers } from '../combat-modifiers.js';
import { skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';

/**
 * The declared parry. A restricted parry (§9.6 Restricted Parrying: unarmed against a weapon, an invisible or
 * incorporeal foe) gives 1 DB per 2 OB, rounded up, as `restricted-parry`.
 */
export const CombatParryPlugin: CombatPlugin = {
  id: 'parry',
  group: 'defense',
  rule: '§9.6',
  hooks: {
    parry: [
      {
        condition: ctx => {
          if (!ctx.attack?.calculated) return false;
          return ctx.attack.modifiers.disabledParry && (ctx.attack.modifiers.parry || 0) > 0
            ? skip('parry-disabled')
            : !ctx.attack.modifiers.disabledParry;
        },
        // Replaces the parry of a previous declaration.
        apply: ctx => {
          const parry = ctx.attack!.modifiers.parry || 0;
          const modifiers = rollModifiers(ctx).remove('parry').remove('restricted-parry');
          if (ctx.attack!.modifiers.restrictedParry) {
            modifiers.add('restricted-parry', -Math.ceil(parry / 2), { parry });
          } else {
            modifiers.add('parry', -parry, { parry });
          }
        },
      },
    ],
  },
};
