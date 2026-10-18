import { isPreparing, preparation, rollModifiers } from '../combat-modifiers';
import { CombatPlugin } from '../combat-plugin';

export const CombatShieldPlugin: CombatPlugin = {
  id: 'shield',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => {
          const shield = ctx.targetActor?.defense?.shield;
          return (
            isPreparing(ctx) &&
            !preparation(ctx).situationalModifiers.disabledShield &&
            !!shield &&
            shield.currentBlocks < shield.blockCount
          );
        },
        apply: ctx => void rollModifiers(ctx).add('shield', -ctx.targetActor!.defense.shield!.db),
      },
    ],
  },
};
