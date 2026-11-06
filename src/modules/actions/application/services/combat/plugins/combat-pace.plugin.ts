import { GRACEFUL_GAIT, UNCOORDINATED } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ValidationError } from '../../../../../shared/domain/errors/errors.js';
import { isMelee, isPreparing, preparation, rollModifiers, sourceSkill, sourceTraitTier } from '../combat-modifiers.js';
import type { CombatContext } from '../combat-context.js';
import type { CombatPlugin } from '../combat-plugin.js';
import { effectivePace, pacePenaltyFor } from '../../../../domain/services/uncoordinated-pace.js';
import { FREE_MOVEMENT_SOURCE } from '../../../../domain/services/free-movement-pace.js';

/** Declared paces that leave no room for an attack (Table 5-3). */
const invalidPaces = new Set(['sprint', 'dash']);

/** Pace whose penalty applies: an Uncoordinated attacker counts one pace faster per tier. */
export { effectivePace };

const uncoordinatedTier = (ctx: CombatContext): number => sourceTraitTier(ctx, UNCOORDINATED);

/**
 * Not in the Python calculator (tactical always sent 0): an intended deviation. The penalty of the pace an
 * Uncoordinated attacker counts as goes in `uncoordinated`, apart from the declared pace's one. Workspace spec 079, D1:
 * only the declared pace forbids the attack (sprint, dash); a pace that counts beyond run takes -25 more per pace.
 */
export const CombatPacePlugin: CombatPlugin = {
  id: 'pace',
  group: 'offense',
  rule: '§8.2',
  hooks: {
    prepare: [
      {
        condition: ctx =>
          isPreparing(ctx) && !!preparation(ctx).pace && pacePenaltyFor(preparation(ctx).pace!, uncoordinatedTier(ctx)) !== 0,
        apply: ctx => {
          const pace = preparation(ctx).pace!;
          if (invalidPaces.has(pace)) {
            throw new ValidationError(`Cannot perform attack at pace '${pace}'`, 'err-attack-invalid-pace');
          }
          const tier = uncoordinatedTier(ctx);
          const effective = effectivePace(pace, tier);
          // Graceful Gait (workspace spec 039): no penalty at walk, normal ones from jog
          const graceful = effective === 'walk' && sourceTraitTier(ctx, GRACEFUL_GAIT) > 0;
          const penalty = pacePenaltyFor(pace);
          const effectivePenalty = graceful ? 0 : pacePenaltyFor(pace, tier);
          // Footwork offsets the pace penalty of melee and thrown attacks (§8.2), not of fired ones.
          const footwork = isMelee(ctx) || ctx.attack?.type === 'thrown' ? sourceSkill(ctx, 'footwork') : 0;
          // Workspace spec 080: the pace of a free movement says which one.
          const movementId = preparation(ctx).paceMovementId;
          rollModifiers(ctx)
            .add('pace-penalty', penalty, movementId ? { pace, source: FREE_MOVEMENT_SOURCE, movementId } : undefined)
            .add('uncoordinated', graceful ? 0 : effectivePenalty - penalty, tier ? { tier, pace: effective } : undefined)
            .add('graceful-gait', graceful ? -penalty : 0)
            .add('pace-penalty-skill', effectivePenalty ? Math.min(Math.abs(effectivePenalty), footwork) : 0);
        },
      },
    ],
  },
};
