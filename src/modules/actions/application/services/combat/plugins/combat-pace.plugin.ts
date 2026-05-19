import { ValidationError } from '../../../../../shared/domain/errors';
import { KeyValueModifier } from '../../../../domain/value-objects/key-value-modifier.vo';
import { CombatPlugin } from '../combat-plugin';

const paceModifiers: Record<string, number> = {
  walk: -25,
  jog: -50,
  run: -75,
};

const invalidPaces = new Set(['sprint', 'dash']);

export const CombatPacePlugin: CombatPlugin = {
  id: 'combat-pace',
  name: 'Combat Pace Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const pace = ctx.attack?.modifiers.pace;
          if (!pace || pace === 'creep') return ctx;
          if (invalidPaces.has(pace)) {
            throw new ValidationError(`Cannot perform attack at pace '${pace}'`);
          }
          const modifier = paceModifiers[pace];
          if (modifier === undefined) return ctx;
          ctx.attackPreparation!.modifiers.rollModifiers.push(new KeyValueModifier('pace', modifier));
          return ctx;
        },
      },
    ],
  },
};
