import { ActionAttack } from '../../../../domain/value-objects/action-attack.vo';
import { isPreparing, preparation, rollModifiers, sourceSkill } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

const DEFAULT_PENALTY = -25;

export const CombatCalledShotPlugin: CombatPlugin = {
  id: 'called-shot',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!ctx.attack && ActionAttack.isCalledShot(ctx.attack),
        apply: ctx => {
          const penalty = preparation(ctx).calledShotPenalty || DEFAULT_PENALTY;
          rollModifiers(ctx).addWithSkill('called-shot', penalty, sourceSkill(ctx, 'called-shot'));
        },
      },
    ],
  },
};
