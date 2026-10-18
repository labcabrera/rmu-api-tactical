import { chargeSizeAdjustment } from '../combat-modifiers';
import { CombatContext } from '../combat-context';
import { CombatPlugin } from '../combat-plugin';

const SEVERITIES = ['Z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const DAMAGE_PER_SIZE = 0.5;

/**
 * Sizes the hit is scaled by. The attack's size adjustment from the strategic sheet already holds the attacker's
 * own size (0 for a medium weapon in a medium hand); the charge stacks on it and the target's size is taken off.
 */
const sizeSteps = (ctx: CombatContext): number =>
  (ctx.sourceAttack?.attackSize || 0) + chargeSizeAdjustment(ctx.attack?.modifiers.chargeSpeed) - (ctx.targetActor?.size || 0);

/**
 * Scales the damage by 50% per size and shifts the critical severity one step per size, as the Python calculator
 * did with the attack size, now against the target's size and with the charge (spec 003 D3).
 */
export const CombatAttackSizePlugin: CombatPlugin = {
  id: 'attack-size',
  group: 'resolution',
  hooks: {
    afterAttackRoll: [
      {
        priority: 10,
        condition: ctx => !!ctx.attackTableEntry && sizeSteps(ctx) !== 0,
        apply: ctx => {
          const entry = ctx.attackTableEntry!;
          const size = sizeSteps(ctx);
          if (entry.damage) {
            entry.damage = Math.ceil(entry.damage * (1 + size * DAMAGE_PER_SIZE));
          }
          const index = entry.criticalSeverity ? SEVERITIES.indexOf(entry.criticalSeverity) : -1;
          if (index >= 0) {
            entry.criticalSeverity = SEVERITIES[Math.max(0, Math.min(index + size, SEVERITIES.length - 1))];
          }
        },
      },
    ],
  },
};
