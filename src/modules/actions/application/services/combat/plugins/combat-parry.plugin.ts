import { rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatParryPlugin: CombatPlugin = {
  id: 'parry',
  group: 'defense',
  hooks: {
    parry: [
      {
        condition: ctx => !!ctx.attack?.calculated && !ctx.attack.modifiers.disabledParry,
        // Replaces the parry of a previous declaration.
        apply: ctx =>
          void rollModifiers(ctx)
            .remove('parry')
            .add('parry', -(ctx.attack!.modifiers.parry || 0)),
      },
    ],
  },
};
