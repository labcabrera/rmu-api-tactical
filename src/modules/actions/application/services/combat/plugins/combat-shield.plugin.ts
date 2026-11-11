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
import { type CombatSkip, PARRY_PHASE, skip } from '../combat-phase.js';
import type { CombatPlugin } from '../combat-plugin.js';
import { CombatModifierBag } from '../combat-modifier-bag.js';
import { SkippedRule } from '../../../../domain/value-objects/skipped-rule.vo.js';
import { isShieldManeuverPending } from '../../../../domain/value-objects/shield-maneuver.vo.js';

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
 * Workspace spec 077, decision A1.2: from the second attack the shield covers in the round (blocks used and taken by the
 * earlier attacks of this action), each attack needs a Shield maneuver. A full or partial block needs it too.
 */
const needsShieldManeuver = (ctx: CombatContext): boolean =>
  ctx.targetActor!.defense.shield!.currentBlocks + (ctx.reservedShieldBlocks || 0) >= 1;

/**
 * Records a rule skipped by a hook that applies (the shield covers, but its maneuver is pending or failed). Recorded as
 * of the parry step, so that a parry declared again replaces it.
 */
const pushSkip = (ctx: CombatContext, reason: string): void => {
  const { source, group, rule } = ctx.plugin!;
  (ctx.skipped ??= []).push(new SkippedRule(source, group, reason, PARRY_PHASE, rule));
};

/** Shield keys the maneuver turns on or off (Evade Shield of the attacker's style depends on them). */
const SHIELD_KEYS = ['shield', 'shield-block', 'evade-shield'];

/**
 * Shield DB (Table 9-6) and blocking. Not against a flank or rear attack, nor for a flatfooted target, and only for
 * as many attacks as the shield blocks per round: apply-attack spends a block when the `shield` entry is there or the
 * attack needed a Shield maneuver (a failed one spends it too). From the second attack the shield DB and the blocking
 * wait for the Shield maneuver of the parry step (rmu-platform/docs/adr/0004-shield-maneuver.adoc, workspace spec 077,
 * decisions A1.2-A1.6): they are kept in `attack.shieldManeuver` and only count with a success or better.
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
          if (!needsShieldManeuver(ctx)) {
            rollModifiers(ctx).add('shield', -db, { db }).add('shield-block', -blockBonus(ctx, db), blockParams(ctx, db));
            return;
          }
          const pending = CombatModifierBag.from([], ctx.plugin)
            .add('shield', -db, { db })
            .add('shield-block', -blockBonus(ctx, db), blockParams(ctx, db));
          ctx.attack!.shieldManeuver = {
            targetId: ctx.targetActor!.actorId,
            required: true,
            skill: targetSkill(ctx, 'shield'),
            modifiers: pending.toArray(),
          };
          pushSkip(ctx, 'shield-maneuver-pending');
        },
      },
    ],
    // Decisions A1.3 and A1.6: with a success or better the shield DB and the blocking count; otherwise neither does.
    parry: [
      {
        condition: ctx => !!ctx.attack?.calculated && !!ctx.attack.shieldManeuver?.required,
        apply: ctx => {
          const maneuver = ctx.attack!.shieldManeuver!;
          const modifiers = rollModifiers(ctx);
          SHIELD_KEYS.forEach(key => modifiers.remove(key));
          if (isShieldManeuverPending(maneuver)) {
            pushSkip(ctx, 'shield-maneuver-pending');
          } else if (!maneuver.passed) {
            pushSkip(ctx, 'shield-maneuver-failed');
          } else {
            modifiers.toArray().push(...maneuver.modifiers.map(modifier => ({ ...modifier })));
          }
        },
      },
    ],
  },
};
