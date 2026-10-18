import { isPreparing, rollModifiers, sourceHasStatus } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatProneSourcePlugin: CombatPlugin = {
  id: 'prone-source',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && (sourceHasStatus(ctx, 'prone') || !!ctx.attack?.modifiers.proneSource),
        apply: ctx => void rollModifiers(ctx).add('prone-source', -50),
      },
    ],
  },
};
