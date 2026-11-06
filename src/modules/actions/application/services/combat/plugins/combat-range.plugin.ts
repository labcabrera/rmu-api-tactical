import { DEADEYE } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { UnprocessableEntityError, ValidationError } from '../../../../../shared/domain/errors/errors.js';
import { isMelee, isPreparing, preparation, rollModifiers, sourceTraitTierForSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatRangePlugin: CombatPlugin = {
  id: 'range',
  group: 'situation',
  rule: 'Table 9-5',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !isMelee(ctx) && preparation(ctx).range !== undefined,
        apply: ctx => {
          if (!ctx.sourceAttack) {
            throw new UnprocessableEntityError(`Attack ${ctx.attack?.attackName} not found on actor`);
          }
          let bracket: { bonus: number; traitBonus?: number };
          try {
            bracket = ctx.sourceAttack.findRange(preparation(ctx).range!);
          } catch (err) {
            throw new ValidationError(`Attack ${ctx.attack?.attackName}: ${(err as Error).message}`);
          }
          // Workspace spec 079, D1: the sheet already reduced the penalty by Deadeye (`traitBonus`); the breakdown shows
          // the penalty of the table and Deadeye's share apart, adding up to the same value.
          const deadeye = Math.max(0, bracket.traitBonus || 0);
          rollModifiers(ctx)
            .add('range-penalty', bracket.bonus - deadeye)
            .add(DEADEYE, deadeye, { tier: sourceTraitTierForSkill(ctx, DEADEYE, ctx.sourceAttack.skillId) });
        },
      },
    ],
  },
};
