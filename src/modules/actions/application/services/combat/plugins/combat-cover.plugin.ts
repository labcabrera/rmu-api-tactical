import { isMelee, isPreparing, preparation, rollModifiers } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

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
  id: 'cover',
  group: 'situation',
  rule: '§9.6',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && preparation(ctx).situationalModifiers.cover !== 'none',
        apply: ctx => {
          const [hardness, level] = preparation(ctx).situationalModifiers.cover.split('_') as ['soft' | 'hard', CoverLevel];
          const base = (isMelee(ctx) ? meleeCoverModifiers : rangedCoverModifiers)[level] || 0;
          rollModifiers(ctx).add('cover', hardness === 'hard' ? base * 2 : base);
        },
      },
    ],
  },
};
