import { LIGHT_BONED } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import {
  ActionAttackResult,
  type SeverityAdjustment,
  type SeverityAdjustmentStep,
} from '../../../../domain/value-objects/action-attack.vo.js';
import { chargeSizeAdjustment, targetTraitTier } from '../combat-modifiers.js';
import type { CombatContext } from '../combat-context.js';
import type { CombatPlugin } from '../combat-plugin.js';
import { styleSizeSteps } from './combat-fighting-style.plugin.js';

/** Severity scale: Z is the lower result of the A column (§9.4), J the top one the expansion plugin knows. */
const SEVERITIES = ['Z', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const A_INDEX = SEVERITIES.indexOf('A');

/** Size the target suffers criticals as: its critical size (NPCs, T-3.1d) or else its size. */
const targetCriticalSize = (ctx: CombatContext): number => ctx.targetActor?.criticalSize ?? ctx.targetActor?.size ?? 0;

/**
 * Steps that move the critical severity (Table 9-4b, T-3.1d, T-3.1e), only the non-zero ones: the attack's size from
 * the strategic sheet (it already holds the attacker's own size), the charge and the fighting style stack on it, the
 * target's critical size is taken off (one less per tier of Light-boned) and its critical code I takes one more.
 */
export const severitySteps = (ctx: CombatContext): SeverityAdjustmentStep[] => {
  const steps: SeverityAdjustmentStep[] = [
    { key: 'attack-size', value: ctx.sourceAttack?.attackSize || 0 },
    { key: 'charge', value: chargeSizeAdjustment(ctx.attack?.modifiers.chargeSpeed) },
    { key: 'fighting-style', value: styleSizeSteps(ctx) },
    { key: 'target-size', value: -targetCriticalSize(ctx) },
    { key: 'light-boned', value: targetTraitTier(ctx, LIGHT_BONED) },
    { key: 'critical-code', value: ctx.targetActor?.reduceCriticalSeverity ? -1 : 0 },
  ];
  return steps.filter(step => step.value !== 0);
};

/**
 * The severity after the steps, capped at J. One step below A is Z, the lower result of the A column (§9.4); two or
 * more below A, or any below A with the code I (T-3.1e), give no critical: null (workspace spec 075, decision 4).
 */
export const adjustSeverity = (original: string, total: number, reduceSeverity: boolean): string | null => {
  const index = SEVERITIES.indexOf(original) + total;
  if (index >= A_INDEX) {
    return SEVERITIES[Math.min(index, SEVERITIES.length - 1)];
  }
  return index === A_INDEX - 1 && !reduceSeverity ? 'Z' : null;
};

/**
 * Shifts the critical severity one step per size (§9.4) and records the change in `results.severityAdjustment`
 * (workspace spec 075, decision 3). The DB keeps the real sizes (spec 007, the size difference plugin), and the damage
 * is scaled by the attack size alone (the attack size damage plugin).
 */
export const CombatAttackSizePlugin: CombatPlugin = {
  id: 'attack-size',
  group: 'resolution',
  rule: '§9.4',
  hooks: {
    afterAttackRoll: [
      {
        priority: 10,
        condition: ctx =>
          !!ctx.attackTableEntry?.criticalSeverity &&
          SEVERITIES.includes(ctx.attackTableEntry.criticalSeverity) &&
          severitySteps(ctx).length > 0,
        apply: ctx => {
          const entry = ctx.attackTableEntry!;
          const steps = severitySteps(ctx);
          const original = entry.criticalSeverity!;
          const total = steps.reduce((sum, step) => sum + step.value, 0);
          const final = adjustSeverity(original, total, !!ctx.targetActor?.reduceCriticalSeverity);
          entry.criticalSeverity = final ?? undefined;
          if (final === null) {
            entry.criticalType = undefined;
          }
          const adjustment: SeverityAdjustment = { original, final, steps };
          if (ctx.attack) {
            ctx.attack.results ??= new ActionAttackResult(entry, undefined, undefined);
            ctx.attack.results.severityAdjustment = adjustment;
          }
        },
      },
    ],
  },
};
