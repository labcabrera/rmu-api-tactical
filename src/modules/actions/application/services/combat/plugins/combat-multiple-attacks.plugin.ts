import { ActorRoundAttack, type WeaponCategory } from '../../../../../actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import type { CombatContext } from '../combat-context.js';
import { isPreparing, isSpellAttack, rollModifiers, sourceSkill } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

const SECOND_ATTACK_PENALTY = -75;
const ADDITIONAL_ATTACK_PENALTY = -25;
const ADDITIONAL_TARGET_PENALTY = -20;
const LIGHT_CATEGORIES: WeaponCategory[] = ['light', 'dagger', 'natural'];
const PRIMARY_LIGHT_BONUS = 10;
/** Off-hand bonus by weapon (Table 9-7b): a dagger or a natural weapon, any other light weapon. */
const OFF_HAND_BONUS: Record<WeaponCategory, number> = { standard: 0, light: 10, dagger: 20, natural: 20 };

/**
 * Light weapon bonus of a kata (Table 9-7b): +10 when the primary weapon is light, plus the off-hand bonus once, and
 * only when every attack beyond the primary qualifies (the lowest of them counts).
 */
const lightWeaponBonus = (attacks: ActorRoundAttack[]): number => {
  if (attacks.length < 2) {
    return 0;
  }
  const primary = attacks.find(attack => attack.attackName === 'mainHand') ?? attacks[0];
  const others = attacks.filter(attack => attack !== primary);
  const primaryBonus = LIGHT_CATEGORIES.includes(primary.weaponCategory) ? PRIMARY_LIGHT_BONUS : 0;
  const offHandBonus = Math.min(...others.map(attack => OFF_HAND_BONUS[attack.weaponCategory] ?? 0));
  return primaryBonus + offHandBonus;
};

const kataAttacks = (ctx: CombatContext): ActorRoundAttack[] => ctx.kataAttacks ?? (ctx.sourceAttack ? [ctx.sourceAttack] : []);

/**
 * §9.7 Katas: the penalty for the attacks of one action and for each foe beyond the first. The light weapon bonuses
 * and then the Multiple Attacks skill offset their sum once, never turning it into a bonus.
 */
export const CombatMultipleAttacksPlugin: CombatPlugin = {
  id: 'multiple-attacks',
  group: 'offense',
  rule: '§9.7',
  hooks: {
    prepare: [
      {
        // The targets of a ball take one attack each: no multiple attacks (RMCL 9.3).
        condition: ctx => isPreparing(ctx) && !isSpellAttack(ctx) && ((ctx.attackNumber || 1) > 1 || (ctx.targetsNumber || 1) > 1),
        apply: ctx => {
          const attacks = ctx.attackNumber || 1;
          const targets = ctx.targetsNumber || 1;
          const attackPenalty = attacks > 1 ? SECOND_ATTACK_PENALTY + (attacks - 2) * ADDITIONAL_ATTACK_PENALTY : 0;
          const targetPenalty = (targets - 1) * ADDITIONAL_TARGET_PENALTY;
          const penalty = -(attackPenalty + targetPenalty);
          const light = Math.min(attacks > 1 ? lightWeaponBonus(kataAttacks(ctx)) : 0, penalty);
          const skill = Math.min(sourceSkill(ctx, 'multiple-attacks'), penalty - light);
          rollModifiers(ctx)
            .add('attack-number', attackPenalty)
            .add('attack-targets', targetPenalty)
            .add('light-weapon', light)
            .add('multiple-attacks-skill', skill);
        },
      },
    ],
  },
};
