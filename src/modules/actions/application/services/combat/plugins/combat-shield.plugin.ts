import type { CombatContext } from '../combat-context.js';
import {
  isPreparing,
  preparation,
  rollModifiers,
  targetInjuryPenalty,
  targetIsFlatfooted,
  targetSkill,
  targetSkillRanks,
} from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** Most DB a shield gives with passive blocking, its own DB included (§9.6 Shields). */
const MAX_PASSIVE_SHIELD_DB = 50;

/**
 * The shield covers the attack: the target has one with blocks left this round (counting the ones earlier attacks of
 * this action take), the attack comes from its front arc and it is aware of it.
 */
const shieldCovers = (ctx: CombatContext): boolean => {
  const shield = ctx.targetActor?.defense?.shield;
  if (!isPreparing(ctx) || !shield || preparation(ctx).situationalModifiers.disabledShield || targetIsFlatfooted(ctx)) {
    return false;
  }
  if (preparation(ctx).situationalModifiers.positionalTarget !== 'none') {
    return false;
  }
  return shield.currentBlocks + (ctx.reservedShieldBlocks || 0) < shield.blockCount;
};

/**
 * DB the Shield skill adds by the declared blocking (§9.6 Shields): the ranks when passive, up to +50 with the
 * shield's own DB; half the skill when partial and the whole skill when full, both reduced by the injury penalties.
 */
const blockBonus = (ctx: CombatContext, shieldDb: number): number => {
  switch (ctx.targetActor!.defenseMode?.block) {
    case 'passive':
      return Math.max(0, Math.min(targetSkillRanks(ctx, 'shield'), MAX_PASSIVE_SHIELD_DB - shieldDb));
    case 'partial':
      return Math.max(0, Math.floor(targetSkill(ctx, 'shield') / 2) + targetInjuryPenalty(ctx));
    case 'full':
      return Math.max(0, targetSkill(ctx, 'shield') + targetInjuryPenalty(ctx));
    default:
      return 0;
  }
};

/**
 * Shield DB (Table 9-6) and blocking. Not against a flank or rear attack, nor for a flatfooted target, and only for
 * as many attacks as the shield blocks per round: apply-attack spends a block when the `shield` entry is there.
 * From the second attack the rule asks for a Shield maneuver; that step waits for
 * rmu-platform/docs/adr/0004-shield-maneuver.adoc.
 */
export const CombatShieldPlugin: CombatPlugin = {
  id: 'shield',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: shieldCovers,
        apply: ctx => {
          const db = ctx.targetActor!.defense.shield!.db;
          rollModifiers(ctx).add('shield', -db).add('shield-block', -blockBonus(ctx, db));
        },
      },
    ],
  },
};
