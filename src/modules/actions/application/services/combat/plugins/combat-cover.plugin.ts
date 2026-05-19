import { Cover } from '../../../../domain/value-objects/action-attack-modifiers.vo';
import { CombatModifierBag } from '../combat-modifier-bag';
import { CombatPlugin } from '../combat-plugin';

type CoverLevel = 'partial' | 'half' | 'full';

const meleeCoverModifiers: Record<CoverLevel, number> = {
  partial: -10,
  half: -20,
  full: -50,
};

const rangedCoverModifiers: Record<CoverLevel, number> = {
  partial: -20,
  half: -40,
  full: -100,
};

export const CombatCoverPlugin: CombatPlugin = {
  id: 'combat-cover',
  name: 'Combat Cover Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          const cover = ctx.attackPreparation?.modifiers.situationalModifiers.cover;
          if (!ctx.attackPreparation || !cover || cover === 'none') {
            return ctx;
          }

          const modifier = calculateCoverModifier(cover, ctx.attackPreparation.modifiers.attackType);
          CombatModifierBag.from(ctx.attackPreparation.modifiers.rollModifiers).add('cover', modifier);
          return ctx;
        },
      },
    ],
  },
};

function calculateCoverModifier(cover: Cover, attackType: string): number {
  const [hardness, level] = cover.split('_') as ['soft' | 'hard', CoverLevel];
  const baseModifier = attackType === 'ranged' || attackType === 'thrown' ? rangedCoverModifiers[level] : meleeCoverModifiers[level];
  return hardness === 'hard' ? baseModifier * 2 : baseModifier;
}
