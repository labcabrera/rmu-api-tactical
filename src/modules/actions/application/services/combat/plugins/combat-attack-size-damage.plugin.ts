import { hitMultiplierOf } from '../../../../../shared/domain/size-scale.js';
import { ActionAttackResult } from '../../../../domain/value-objects/action-attack.vo.js';
import type { CombatContext } from '../combat-context.js';
import type { CombatPlugin } from '../combat-plugin.js';

const multiplierOf = (ctx: CombatContext): number => hitMultiplierOf(ctx.sourceAttack?.attackSize || 0);

/**
 * Scales the damage of the table by the Hit Multiplier of the attack size (Table 9-4a, Hits Adjustment Due to Size;
 * workspace spec 075, decision 2, replacing spec 007, decision 1, and spec 033, question 2), rounded to the nearest
 * integer. The attack size already holds the attacker's size, the weapon's and its traits; the charge, the fighting
 * style and the target's size do not count (§9.4 applies them to the critical only). The table damage is kept in
 * `results.damageAdjustment`.
 */
export const CombatAttackSizeDamagePlugin: CombatPlugin = {
  id: 'attack-size-damage',
  group: 'resolution',
  rule: 'Table 9-4a',
  hooks: {
    afterAttackRoll: [
      {
        condition: ctx => (ctx.attackTableEntry?.damage ?? 0) > 0 && multiplierOf(ctx) !== 1,
        apply: ctx => {
          const entry = ctx.attackTableEntry!;
          const multiplier = multiplierOf(ctx);
          const baseDamage = entry.damage;
          entry.damage = Math.round(baseDamage * multiplier);
          if (ctx.attack) {
            ctx.attack.results ??= new ActionAttackResult(entry, undefined, undefined);
            ctx.attack.results.damageAdjustment = { baseDamage, multiplier };
          }
        },
      },
    ],
  },
};
