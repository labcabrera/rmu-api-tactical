import { criticalModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

const MAX_TABLE_ROLL = 175;
const ROLL_PER_CRITICAL_POINT = 5;

/** A total above the table's top row adds 1 to the critical roll per 5 points over it. */
export const CombatAbsoluteHitPlugin: CombatPlugin = {
  id: 'absolute-hit',
  group: 'resolution',
  hooks: {
    afterAttackRoll: [
      {
        condition: ctx => !!ctx.attackTableEntry && (ctx.rollTotal || 0) > MAX_TABLE_ROLL,
        apply: ctx =>
          void criticalModifiers(ctx).add('absolute-hit', Math.ceil((ctx.rollTotal! - MAX_TABLE_ROLL) / ROLL_PER_CRITICAL_POINT)),
      },
    ],
  },
};
