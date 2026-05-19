import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

export const CombatShieldPlugin: CombatPlugin = {
  id: 'combat-shield',
  name: 'Combat Shield Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          if (ctx.attackPreparation?.modifiers.situationalModifiers.disabledShield) {
            return ctx;
          }

          const targetId = ctx.attack?.modifiers.targetId;
          const targetActor = ctx.targetActor ?? ctx.actors?.find(a => a.actorId === targetId);
          const shield = targetActor?.defense?.shield;

          if (!shield || shield.currentBlocks >= shield.blockCount) {
            return ctx;
          }
          const modifier = -shield.db;
          CombatModifierBag.from(ctx.attackPreparation!.modifiers.rollModifiers).add('shield', modifier);
          return ctx;
        },
      },
    ],
  },
};
