import { ValidationError } from '../../../../../shared/domain/errors';
import { isMelee, isPreparing, preparation, rollModifiers, sourceSkill } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

const paceModifiers: Record<string, number> = {
  walk: -25,
  jog: -50,
  run: -75,
};

const invalidPaces = new Set(['sprint', 'dash']);

/** Not in the Python calculator (tactical always sent 0): an intended deviation. */
export const CombatPacePlugin: CombatPlugin = {
  id: 'pace',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!preparation(ctx).pace && preparation(ctx).pace !== 'creep',
        apply: ctx => {
          const pace = preparation(ctx).pace!;
          if (invalidPaces.has(pace)) {
            throw new ValidationError(`Cannot perform attack at pace '${pace}'`);
          }
          const penalty = paceModifiers[pace] || 0;
          // Footwork offsets the pace penalty of melee and thrown attacks (§8.2), not of fired ones.
          const footwork = isMelee(ctx) || ctx.attack?.type === 'thrown' ? sourceSkill(ctx, 'footwork') : 0;
          rollModifiers(ctx).addWithSkill('pace-penalty', penalty, footwork);
        },
      },
    ],
  },
};
