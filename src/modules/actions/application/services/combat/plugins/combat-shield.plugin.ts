import type { CombatContext } from '../combat-context.js';
import {
  ignoredDefenseSkip,
  isPreparing,
  preparation,
  rollModifiers,
  targetInjuryPenalty,
  targetIgnoresDefense,
  targetSkill,
  targetSkillRanks,
} from '../combat-modifiers.js';
import type { ModifierParams } from '../../../../domain/value-objects/key-value-modifier.vo.js';
import { type CombatSkip, skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** Most DB a shield gives with passive blocking, its own DB included (§9.6 Shields). */
const MAX_PASSIVE_SHIELD_DB = 50;

/**
 * The shield covers the attack: the target has one with blocks left this round (counting the ones earlier attacks of
 * this action take), the attack comes from its front arc and it is aware of it. A target with a shield that does not
 * cover it gets the reason (spec 051).
 */
const shieldCovers = (ctx: CombatContext): boolean | CombatSkip => {
  const shield = ctx.targetActor?.defense?.shield;
  if (!isPreparing(ctx) || !shield) {
    return false;
  }
  if (preparation(ctx).situationalModifiers.disabledShield) {
    return skip('shield-disabled');
  }
  if (targetIgnoresDefense(ctx)) {
    return ignoredDefenseSkip(ctx);
  }
  const position = preparation(ctx).situationalModifiers.positionalTarget;
  if (position !== 'none') {
    return skip('shield-not-front', { position });
  }
  if (shield.currentBlocks + (ctx.reservedShieldBlocks || 0) >= shield.blockCount) {
    return skip('shield-no-blocks', { blocks: shield.blockCount });
  }
  return true;
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

/** Inputs of the block bonus, for its explanation. */
const blockParams = (ctx: CombatContext, shieldDb: number): ModifierParams => {
  const mode = ctx.targetActor!.defenseMode?.block ?? 'none';
  return mode === 'passive'
    ? { mode, ranks: targetSkillRanks(ctx, 'shield'), max: MAX_PASSIVE_SHIELD_DB - shieldDb }
    : { mode, skill: targetSkill(ctx, 'shield'), injury: targetInjuryPenalty(ctx) };
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
  rule: '§9.6',
  hooks: {
    prepare: [
      {
        condition: shieldCovers,
        apply: ctx => {
          const db = ctx.targetActor!.defense.shield!.db;
          rollModifiers(ctx).add('shield', -db, { db }).add('shield-block', -blockBonus(ctx, db), blockParams(ctx, db));
        },
      },
    ],
  },
};
