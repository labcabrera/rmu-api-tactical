import { GRACEFUL_GAIT, UNCOORDINATED } from '../../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { ValidationError } from '../../../../../shared/domain/errors/errors.js';
import { isMelee, isPreparing, preparation, rollModifiers, sourceSkill, sourceTraitTier } from '../combat-modifiers.js';
import type { CombatContext } from '../combat-context.js';
import type { CombatPlugin } from '../combat-plugin.js';

const paceModifiers: Record<string, number> = {
  walk: -25,
  jog: -50,
  run: -75,
};

const invalidPaces = new Set(['sprint', 'dash']);

/** Paces from slowest to fastest. */
const PACE_ORDER = ['creep', 'walk', 'jog', 'run', 'sprint', 'dash'];

/** Pace whose penalty applies: an Uncoordinated attacker counts one pace faster per tier. */
export const effectivePace = (pace: string, uncoordinatedTier: number): string => {
  const index = PACE_ORDER.indexOf(pace);
  if (index < 0 || uncoordinatedTier <= 0) {
    return pace;
  }
  return PACE_ORDER[Math.min(index + uncoordinatedTier, PACE_ORDER.length - 1)];
};

const uncoordinatedPace = (ctx: CombatContext): string => effectivePace(preparation(ctx).pace!, sourceTraitTier(ctx, UNCOORDINATED));

/**
 * Not in the Python calculator (tactical always sent 0): an intended deviation. The penalty of the pace an
 * Uncoordinated attacker counts as goes in `uncoordinated`, apart from the declared pace's one.
 */
export const CombatPacePlugin: CombatPlugin = {
  id: 'pace',
  group: 'offense',
  rule: '§8.2',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!preparation(ctx).pace && uncoordinatedPace(ctx) !== 'creep',
        apply: ctx => {
          const pace = preparation(ctx).pace!;
          const effective = uncoordinatedPace(ctx);
          if (invalidPaces.has(effective)) {
            const message =
              effective === pace
                ? `Cannot perform attack at pace '${pace}'`
                : `Cannot perform attack at pace '${pace}': an uncoordinated actor counts it as '${effective}'`;
            throw new ValidationError(message, 'err-attack-invalid-pace');
          }
          // Graceful Gait (workspace spec 039): no penalty at walk, normal ones from jog
          const graceful = effective === 'walk' && sourceTraitTier(ctx, GRACEFUL_GAIT) > 0;
          const penalty = paceModifiers[pace] || 0;
          const effectivePenalty = graceful ? 0 : paceModifiers[effective] || 0;
          // Footwork offsets the pace penalty of melee and thrown attacks (§8.2), not of fired ones.
          const footwork = isMelee(ctx) || ctx.attack?.type === 'thrown' ? sourceSkill(ctx, 'footwork') : 0;
          rollModifiers(ctx)
            .add('pace-penalty', penalty)
            .add('uncoordinated', graceful ? 0 : effectivePenalty - penalty)
            .add('graceful-gait', graceful ? -penalty : 0)
            .add('pace-penalty-skill', effectivePenalty ? Math.min(Math.abs(effectivePenalty), footwork) : 0);
        },
      },
    ],
  },
};
