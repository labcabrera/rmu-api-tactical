import { SPASM } from '../../../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { isPreparing, rollModifiers, targetHasStatus } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

export const CombatStunPlugin: CombatPlugin = {
  id: 'stunned-target',
  group: 'defense',
  rule: 'Table 9-5',
  hooks: {
    prepare: [
      {
        // Workspace spec 076: a spasm stuns as a Stun.
        condition: ctx =>
          isPreparing(ctx) && (targetHasStatus(ctx, 'stunned') || targetHasStatus(ctx, SPASM) || !!ctx.attack?.modifiers.stunnedFoe),
        apply: ctx => void rollModifiers(ctx).add('stunned-target', 20),
      },
    ],
  },
};
