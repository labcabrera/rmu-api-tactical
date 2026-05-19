import { KeyValueModifier } from '../../../../domain/value-objects/key-value-modifier.vo';
import { CombatPlugin } from '../combat-plugin';

export const CombatHigherGroundPlugin: CombatPlugin = {
  id: 'combat-higher-ground',
  name: 'Combat Higher Ground Plugin',
  version: '1.0.0',
  hooks: {
    prepare: [
      {
        apply: ctx => {
          if (!ctx.attackPreparation?.modifiers.situationalModifiers.higherGround) return ctx;
          ctx.attackPreparation!.modifiers.rollModifiers.push(new KeyValueModifier('higherGround', 10));
          return ctx;
        },
      },
    ],
  },
};
