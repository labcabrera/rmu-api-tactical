import { LIGHT_BONED } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { adjustSeverity, SEVERITIES, type SeverityAdjustmentStep, severitySteps } from '../../../../../shared/domain/severity.js';
import { ActionAttackResult, type SeverityAdjustment } from '../../../../domain/value-objects/action-attack.vo.js';
import { chargeSizeAdjustment, isMelee, targetTraitTier } from '../combat-modifiers.js';
import type { CombatContext } from '../combat-context.js';
import type { CombatPlugin } from '../combat-plugin.js';
import { styleSizeSteps } from './combat-fighting-style.plugin.js';

/**
 * Attack sizes of an active Adrenal Strength of the attacker (§3.4; workspace spec 079, decision B3): +1 (+2 in the
 * doubled round of an absolute success), -1 the round after an absolute failure. Only the melee attacks, where the
 * attacker's strength is what strikes.
 */
export const adrenalStrengthSteps = (ctx: CombatContext): number => (isMelee(ctx) ? (ctx.sourceActor?.adrenalStrengthSteps?.() ?? 0) : 0);

/** Size the target suffers criticals as: its critical size (NPCs, T-3.1d) or else its size. */
const targetCriticalSize = (ctx: CombatContext): number => ctx.targetActor?.criticalSize ?? ctx.targetActor?.size ?? 0;

/**
 * Steps that move the critical severity (Table 9-4b, T-3.1d, T-3.1e), only the non-zero ones: the attack's size from
 * the strategic sheet (it already holds the attacker's own size), the charge and the fighting style stack on it, the
 * target's critical size is taken off (one less per tier of Light-boned) and its critical code I takes one more. The
 * scale and the adjustment are shared with the hazards (workspace spec 077, decision D1).
 */
export const combatSeveritySteps = (ctx: CombatContext): SeverityAdjustmentStep[] =>
  severitySteps({
    'attack-size': ctx.sourceAttack?.attackSize || 0,
    'adrenal-strength': adrenalStrengthSteps(ctx),
    charge: chargeSizeAdjustment(ctx.attack?.modifiers.chargeSpeed),
    'fighting-style': styleSizeSteps(ctx),
    'target-size': -targetCriticalSize(ctx),
    'light-boned': targetTraitTier(ctx, LIGHT_BONED),
    'critical-code': ctx.targetActor?.reduceCriticalSeverity ? -1 : 0,
  });

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
          combatSeveritySteps(ctx).length > 0,
        apply: ctx => {
          const entry = ctx.attackTableEntry!;
          const steps = combatSeveritySteps(ctx);
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
