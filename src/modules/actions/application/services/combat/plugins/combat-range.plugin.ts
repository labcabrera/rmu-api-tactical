import { UnprocessableEntityError, ValidationError } from '../../../../../shared/domain/errors/errors';
import { isMelee, isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatRangePlugin: CombatPlugin = {
  id: 'range',
  group: 'situation',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !isMelee(ctx) && preparation(ctx).range !== undefined,
        apply: ctx => {
          if (!ctx.sourceAttack) {
            throw new UnprocessableEntityError(`Attack ${ctx.attack?.attackName} not found on actor`);
          }
          let penalty: number;
          try {
            penalty = ctx.sourceAttack.calculateRangeBonus(preparation(ctx).range!);
          } catch (err) {
            throw new ValidationError(`Attack ${ctx.attack?.attackName}: ${(err as Error).message}`);
          }
          rollModifiers(ctx).add('range-penalty', penalty);
        },
      },
    ],
  },
};
