import { isPreparing, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

/**
 * The attacker's penalties (hit points, criticals, endurance…), one `penalty-<source>` entry per source. They are
 * read from the attacker's actor round when the attack is resolved, so a penalty gained after declaring counts.
 */
export const CombatActorPenaltiesPlugin: CombatPlugin = {
  id: 'actor-penalties',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!ctx.sourceActor?.getPenaltiesBySource().length,
        apply: ctx => {
          const modifiers = rollModifiers(ctx);
          ctx.sourceActor!.getPenaltiesBySource().forEach(({ source, value }) => modifiers.add(`penalty-${source}`, value));
        },
      },
    ],
  },
};
