import { ActionAttack } from '../../../../domain/value-objects/action-attack.vo.js';
import { isPreparing, preparation, rollModifiers, sourceSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const DEFAULT_PENALTY = -25;

export const CombatCalledShotPlugin: CombatPlugin = {
  id: 'called-shot',
  group: 'offense',
  rule: '§9.7',
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
