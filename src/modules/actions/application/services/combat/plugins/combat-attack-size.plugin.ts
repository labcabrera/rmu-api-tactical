import { chargeSizeAdjustment } from '../combat-modifiers';
import { CombatContext } from '../combat-context';
import { CombatPlugin } from '../combat-plugin';

const SEVERITIES = ['Z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];

/**
 * Steps the critical severity moves (Table 9-4b): the attack's size adjustment from the strategic sheet already
 * holds the attacker's own size (0 for a medium weapon in a medium hand); the charge stacks on it and the target's
 * size is taken off.
 */
const sizeSteps = (ctx: CombatContext): number =>
  (ctx.sourceAttack?.attackSize || 0) + chargeSizeAdjustment(ctx.attack?.modifiers.chargeSpeed) - (ctx.targetActor?.size || 0);

/**
 * Shifts the critical severity one step per size (§9.4). The hits are not scaled: the optional Hits Adjustment Due
 * to Size is not applied (spec 007, decision 1, replacing spec 003 D3).
 */
export const CombatAttackSizePlugin: CombatPlugin = {
  id: 'attack-size',
  group: 'resolution',
  hooks: {
    afterAttackRoll: [
      {
        priority: 10,
        condition: ctx => !!ctx.attackTableEntry?.criticalSeverity && sizeSteps(ctx) !== 0,
        apply: ctx => {
          const entry = ctx.attackTableEntry!;
          const index = SEVERITIES.indexOf(entry.criticalSeverity!);
          if (index >= 0) {
            entry.criticalSeverity = SEVERITIES[Math.max(0, Math.min(index + sizeSteps(ctx), SEVERITIES.length - 1))];
          }
        },
      },
    ],
  },
};
