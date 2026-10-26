import {
  activeStyleAbility,
  activeStyleWorksWith,
  type ActorRoundActiveStyle,
} from '../../../../../actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ActionAttack } from '../../../../domain/value-objects/action-attack.vo.js';
import type { CombatContext } from '../combat-context.js';
import { criticalModifiers, isMelee, isPreparing, preparation, rollModifiers, sourceTraitTier } from '../combat-modifiers.js';
import type { CombatPlugin } from '../combat-plugin.js';

/** Off-hand attack penalty the strategic sheet puts in the OB (without the Ambidextrous talent). */
const OFF_HAND_PENALTY = 20;
const OFF_HAND_ATTACK = 'offHand';
const AMBIDEXTROUS = 'ambidextrous';
/** Point-Blank Shot: +20 within 20' (ranges in feet). */
const POINT_BLANK_RANGE = 20;
const POINT_BLANK_BONUS = 20;
/** Precise Target: the called shot penalty is -10 instead of -25. */
const PRECISE_TARGET_PENALTY = -10;
const DEFAULT_CALLED_SHOT_PENALTY = -25;
const KILLING_STRIKE_PENALTY = -10;
const KILLING_STRIKE_CRITICAL = 5;
const HEEDLESS_FURY_BONUS = 20;
/** Binding Chain: the attack to bind the foe is at -10 (its criticals are Grapple). */
const BINDING_CHAIN_PENALTY = -10;

const sourceStyle = (ctx: CombatContext): ActorRoundActiveStyle | null | undefined => ctx.sourceActor?.activeStyle;
const targetStyle = (ctx: CombatContext): ActorRoundActiveStyle | null | undefined => ctx.targetActor?.activeStyle;
const attackName = (ctx: CombatContext): string => ctx.attack?.attackName ?? '';

/** The source's active style has the ability and it works with the attack. */
const sourceAbility = (ctx: CombatContext, abilityId: string) => activeStyleAbility(sourceStyle(ctx), abilityId, attackName(ctx));

/** The source declared the optional ability this round (Killing Strike). */
const sourceOption = (ctx: CombatContext, abilityId: string): boolean =>
  !!sourceAbility(ctx, abilityId) && !!sourceStyle(ctx)?.options.includes(abilityId);

const targetOption = (ctx: CombatContext, abilityId: string): boolean =>
  !!activeStyleAbility(targetStyle(ctx), abilityId) && !!targetStyle(ctx)?.options.includes(abilityId);

/** Heedless Fury: the attack counts one size larger (Table 9-4b), read by the attack-size plugin. */
export const styleSizeSteps = (ctx: CombatContext): number => (isMelee(ctx) && sourceAbility(ctx, 'heedless-fury') ? 1 : 0);

const offHandAbility = (ctx: CombatContext): string | undefined => {
  const attack = ctx.sourceAttack;
  if (!attack || attack.attackName !== OFF_HAND_ATTACK || sourceTraitTier(ctx, AMBIDEXTROUS) > 0) return undefined;
  if (attack.weaponCategory === 'dagger' && sourceAbility(ctx, 'off-hand-dagger')) return 'off-hand-dagger';
  if (['dagger', 'light'].includes(attack.weaponCategory) && sourceAbility(ctx, 'off-hand-light-weapon')) return 'off-hand-light-weapon';
  return undefined;
};

/**
 * Fighting style of the attacker (workspace spec 032): the OB of the free ranks and the abilities that change the
 * attack. Registered after the cover and before the called shot plugins: Trick Shot halves the cover modifier, and
 * Precise Target lowers the called shot penalty before it is added.
 */
export const CombatFightingStyleSourcePlugin: CombatPlugin = {
  id: 'fighting-style',
  group: 'offense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && activeStyleWorksWith(sourceStyle(ctx), attackName(ctx)),
        apply: ctx => {
          const style = sourceStyle(ctx)!;
          const modifiers = rollModifiers(ctx);
          modifiers.add('style-free-ranks', style.freeRanksBonus);
          const offHand = offHandAbility(ctx);
          if (offHand) modifiers.add(offHand, OFF_HAND_PENALTY);
          const range = preparation(ctx).range;
          if (!isMelee(ctx) && range !== undefined && range <= POINT_BLANK_RANGE && sourceAbility(ctx, 'point-blank-shot')) {
            modifiers.add('point-blank-shot', POINT_BLANK_BONUS);
          }
          if (!isMelee(ctx) && sourceAbility(ctx, 'trick-shot')) {
            modifiers.add('trick-shot', Math.floor(-modifiers.value('cover') / 2));
          }
          if (!isMelee(ctx) && ctx.attack && ActionAttack.isCalledShot(ctx.attack) && sourceAbility(ctx, 'precise-target')) {
            const penalty = preparation(ctx).calledShotPenalty || DEFAULT_CALLED_SHOT_PENALTY;
            preparation(ctx).calledShotPenalty = Math.max(penalty, PRECISE_TARGET_PENALTY);
          }
          if (sourceAbility(ctx, 'evade-shield')) {
            modifiers.add('evade-shield', Math.floor(-(modifiers.value('shield') + modifiers.value('shield-block')) / 2));
          }
          if (ctx.attack?.modifiers.styleCriticalOption === 'binding-chain') {
            modifiers.add('binding-chain', BINDING_CHAIN_PENALTY);
          }
          if (sourceOption(ctx, 'killing-strike')) {
            modifiers.add('killing-strike', KILLING_STRIKE_PENALTY);
            criticalModifiers(ctx).add('killing-strike', KILLING_STRIKE_CRITICAL);
          }
          ctx.trace.push({ source: 'fighting-style', message: `Fighting style ${style.styleId}` });
        },
      },
    ],
  },
};

/**
 * Fighting style of the target (workspace spec 032): Heedless Fury and Killing Strike open its defense; Improved
 * Parry and Unarmed Parry make its parry worth more. Registered after the parry plugin.
 */
export const CombatFightingStyleTargetPlugin: CombatPlugin = {
  id: 'fighting-style-target',
  group: 'defense',
  hooks: {
    prepare: [
      {
        condition: ctx => isPreparing(ctx) && !!targetStyle(ctx)?.met,
        apply: ctx => {
          const modifiers = rollModifiers(ctx);
          if (isMelee(ctx) && activeStyleAbility(targetStyle(ctx), 'heedless-fury')) {
            modifiers.add('heedless-fury', HEEDLESS_FURY_BONUS);
          }
          if (targetOption(ctx, 'killing-strike')) {
            modifiers.add('killing-strike-target', -KILLING_STRIKE_PENALTY);
          }
        },
      },
    ],
    parry: [
      {
        condition: ctx => !!ctx.attack?.calculated && !ctx.attack.modifiers.disabledParry && !!targetStyle(ctx)?.met,
        // Replaces the bonus of a previous declaration, as the parry plugin does.
        apply: ctx => {
          const parry = ctx.attack!.modifiers.parry || 0;
          const modifiers = rollModifiers(ctx).remove('improved-parry').remove('unarmed-parry');
          const restricted = !!ctx.attack!.modifiers.restrictedParry;
          if (restricted && activeStyleAbility(targetStyle(ctx), 'unarmed-parry')) {
            modifiers.add('unarmed-parry', -(parry - Math.ceil(parry / 2)));
          }
          if (!restricted || activeStyleAbility(targetStyle(ctx), 'unarmed-parry')) {
            if (activeStyleAbility(targetStyle(ctx), 'improved-parry')) modifiers.add('improved-parry', -Math.floor(parry / 2));
          }
        },
      },
    ],
  },
};
