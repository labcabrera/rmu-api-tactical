import { ValidationError } from '../../../../../shared/domain/errors';
import { CombatModifierBag } from '../combat-modifier-bag';
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

          const footworkSkill = ctx.sourceSkills?.find(s => s.skillId === 'footwork')?.bonus || 0;
          const adjustedModifier = Math.min(-modifier, footworkSkill);

          CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('pace', modifier);
          CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('footwork', adjustedModifier);
          return ctx;
        },
      },
    ],
  },
};
