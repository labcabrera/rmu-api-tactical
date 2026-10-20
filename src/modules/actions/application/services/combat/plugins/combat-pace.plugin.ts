import { UNCOORDINATED } from '../../../../../actor-rounds/domain/value-objets/actor-round-trait.vo';
import { ValidationError } from '../../../../../shared/domain/errors';
import { isMelee, isPreparing, preparation, rollModifiers, sourceSkill, sourceTraitTier } from '../combat-modifiers';
import { CombatContext } from '../combat-context';
import { CombatPlugin } from '../combat-plugin';

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
          const penalty = paceModifiers[pace] || 0;
          const effectivePenalty = paceModifiers[effective] || 0;
          // Footwork offsets the pace penalty of melee and thrown attacks (§8.2), not of fired ones.
          const footwork = isMelee(ctx) || ctx.attack?.type === 'thrown' ? sourceSkill(ctx, 'footwork') : 0;
          rollModifiers(ctx)
            .add('pace-penalty', penalty)
            .add('uncoordinated', effectivePenalty - penalty)
            .add('pace-penalty-skill', effectivePenalty ? Math.min(Math.abs(effectivePenalty), footwork) : 0);
        },
      },
    ],
  },
};
