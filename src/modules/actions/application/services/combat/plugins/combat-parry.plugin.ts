import { rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

/**
 * The declared parry. A restricted parry (§9.6 Restricted Parrying: unarmed against a weapon, an invisible or
 * incorporeal foe) gives 1 DB per 2 OB, rounded up, as `restricted-parry`.
 */
export const CombatParryPlugin: CombatPlugin = {
  id: 'parry',
  group: 'defense',
  hooks: {
    parry: [
      {
        condition: ctx => !!ctx.attack?.calculated && !ctx.attack.modifiers.disabledParry,
        // Replaces the parry of a previous declaration.
        apply: ctx => {
          const parry = ctx.attack!.modifiers.parry || 0;
          const modifiers = rollModifiers(ctx).remove('parry').remove('restricted-parry');
          if (ctx.attack!.modifiers.restrictedParry) {
            modifiers.add('restricted-parry', -Math.ceil(parry / 2));
          } else {
            modifiers.add('parry', -parry);
          }
        },
      },
    ],
  },
};
