import { Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { activeStyleAbility } from '../../../../actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { ActorSheet } from '../../../../actor-rounds/application/services/actor-sheet.service.js';
import { KeyValueModifier, type ModifierGroup, type ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';
import { SkippedRule } from '../../../domain/value-objects/skipped-rule.vo.js';
import { AP_PENALTY_PER_MISSING, ActionApProfile } from '../../../domain/value-objects/action-ap-profile.vo.js';
import type { SkillManeuverProfile } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { Pace } from '../../../domain/value-objects/pace.vo.js';
import { toOptionalKey } from '../../../../shared/domain/services/key.js';
import { ActorRoundTrait, UNCOORDINATED } from '../../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { effectivePace, pacePenaltyFor } from '../../../domain/services/uncoordinated-pace.js';
import { FREE_MOVEMENT_SOURCE } from '../../../domain/services/free-movement-pace.js';

/** Bonus of a character without the skill (chapter 3). */
export const UNSKILLED_BONUS = -25;

/** §8.1: penalty per action point below the maximum of the action's range. */
export const ACTION_POINT_PENALTY = AP_PENALTY_PER_MISSING;

/** Table 5-3 gives only an AP cost for these paces: the whole round goes into moving. */
const FULL_ROUND_PACES = new Set(['sprint', 'dash']);

/**
 * Fixed bonuses of fighting style abilities to a skill while the style is active (workspace spec 032, group A). The
 * ones that depend on what the maneuver is for (Vigilant, Improved Frenzy, Dirty Fighting...) are left to the game
 * master.
 */
const STYLE_SKILL_BONUSES: { abilityId: string; skillId: string; specialization?: string; value: number }[] = [
  { abilityId: 'aspect-of-fear', skillId: 'influence', specialization: 'intimidation', value: 10 },
  { abilityId: 'disarming', skillId: 'disarm', value: 10 },
  { abilityId: 'experienced-rider', skillId: 'mounted-combat', value: 10 },
  { abilityId: 'experienced-rider', skillId: 'riding', value: 5 },
  { abilityId: 'gentle-tap', skillId: 'subduing', value: 10 },
  { abilityId: 'loyal-protector', skillId: 'protect', value: 10 },
  { abilityId: 'marshals-voice', skillId: 'leadership', value: 10 },
  { abilityId: 'shadowblade', skillId: 'blind-fighting', value: 10 },
  { abilityId: 'sharp-words', skillId: 'influence', value: 10 },
];

/** Where a base modifier comes from. */
export type ManeuverBaseSource = 'actor-round' | 'equipment' | 'movement' | 'action';

export interface ManeuverBaseModifier {
  key: string;
  value: number;
  source: ManeuverBaseSource;
  /** Workspace spec 052: breakdown group, rule reference and the inputs of its explanation. */
  group?: ModifierGroup;
  rule?: string;
  params?: ModifierParams;
}

/** Phase of the rules a maneuver skips, as `SkippedRule.phase`. */
export const MANEUVER_PHASE = 'maneuver';

/** Rule references of the maneuver modifiers (Core Law), shown with their explanation (workspace spec 052). */
export const MANEUVER_RULES = {
  skill: 'Table 3-0b',
  unskilled: 'Ch. 3, Skill Bonus',
  difficulty: '§5.1',
  armor: '§7.2',
  encumbrance: '§5.4',
  breakage: '§6.1',
  pace: 'Table 5-3',
  actionPoints: '§8.1',
  light: 'Table 15-7',
  lightSensitivity: '§4.5',
  conflict: '§8.2',
  frenzy: '§3.4',
  adrenal: '§3.4, Table 3-4',
  uncoordinated: 'Core Law ch. 4',
  situationalTalent: 'Core Law ch. 4',
} as const;

export interface ManeuverSkillBonus {
  skillId: string;
  specialization: string | null;
  bonus: number;
  ranks: number;
  /** The character does not have the skill: it rolls with `UNSKILLED_BONUS`. */
  unskilled: boolean;
}

export interface ManeuverBaseInput {
  actorRound: ActorRound;
  /** The character sheet, or the stat block of an NPC (spec 055). */
  character: ActorSheet;
  profile: SkillManeuverProfile;
  skillId: string;
  specialization?: string | null;
  /** AP the action takes, for the AP shortfall. Null skips it. */
  actionPoints: number | null;
  /** The action is an instantaneous one (a sprint or a dash still allows it). */
  freeAction?: boolean;
  /**
   * Pace the action is made at: the fastest free movement of the actor that overlaps it (workspace spec 080, decision
   * 3), or the pace of the movement itself for its roll.
   */
  pace: Pace | null;
  /** The free movement the pace comes from (workspace spec 080): the `pace` line says so. */
  paceMovementId?: string | null;
  /** False for the movement roll itself: the pace penalty does not affect it (§5.3). */
  includePace: boolean;
  /** Skill category of the skill rolled: Adrenal Focus helps the Brawn, Gymnastic and Movement maneuvers (spec 079). */
  categoryId?: string | null;
  /** A Fortitude maneuver takes every penalty, without the relief of an earlier Fortitude (§3.5; spec 079). */
  withoutFortitude?: boolean;
}

/** Skill categories Adrenal Focus helps (§3.4; workspace spec 079, decision B3). */
export const ADRENAL_FOCUS_CATEGORIES = ['brawn', 'gymnastic', 'movement'];

export interface ManeuverBaseResult {
  skill: ManeuverSkillBonus;
  base: ManeuverBaseModifier[];
  /** Rules the player could expect that do not apply, and why (workspace spec 052). */
  skipped: SkippedRule[];
}

/**
 * Base modifiers of a maneuver (§5.1, §5.3, §8.1 and chapter 3): what the rules apply on their own from the actor's
 * round, its sheet and the skill's maneuver profile. The formulas are rule constants; the profile comes from core.
 */
@Injectable()
export class ManeuverBaseModifiersService {
  compute(input: ManeuverBaseInput): ManeuverBaseResult {
    const base: ManeuverBaseModifier[] = [];
    const skipped: SkippedRule[] = [];
    this.addActorPenalties(base, input.actorRound, !!input.withoutFortitude);
    this.addAdrenalModifiers(base, input.actorRound, input.skillId, input.categoryId ?? null);
    if (input.profile.movement) {
      this.addEquipmentPenalties(base, input.character, input.actorRound);
    }
    if (input.includePace) {
      this.addPacePenalty(
        base,
        skipped,
        input.pace,
        !!input.freeAction,
        ActorRoundTrait.tierOf(input.actorRound.traits, UNCOORDINATED),
        input.paceMovementId ?? null,
      );
    } else if (input.pace) {
      skipped.push(new SkippedRule('pace', 'situation', 'pace-movement-roll', MANEUVER_PHASE, MANEUVER_RULES.pace, { pace: input.pace }));
    }
    this.addActionPointsPenalty(base, input.profile, input.actionPoints);
    this.addStyleBonuses(base, input.actorRound, input.skillId, input.specialization ?? null);
    return {
      skill: ManeuverBaseModifiersService.skillBonus(input.character, input.skillId, input.specialization ?? null),
      base: base.filter(modifier => modifier.value !== 0),
      skipped,
    };
  }

  /**
   * The skill bonus of the sheet with its specialization (a skill the sheet keeps without specializations matches any).
   * A character without the skill, or without that specialization, rolls with -25; an NPC whose stat block does not
   * list it, with 0 (spec 055).
   */
  static skillBonus(character: ActorSheet, skillId: string, specialization: string | null): ManeuverSkillBonus {
    const entries = (character.skills || []).filter(s => s.skillId === skillId);
    // Spec 050: sheets store catalog keys; a caller or a sheet not yet migrated may send the name (`Black Speech`)
    const wanted = toOptionalKey(specialization);
    const skill =
      entries.find(s => toOptionalKey(s.specialization) === wanted) ??
      (specialization ? entries.find(s => !s.specialization && !entries.some(other => !!other.specialization)) : undefined);
    if (!skill) {
      return character.npc
        ? { skillId, specialization, bonus: 0, ranks: 0, unskilled: false }
        : { skillId, specialization, bonus: UNSKILLED_BONUS, ranks: 0, unskilled: true };
    }
    return { skillId, specialization, bonus: skill.totalBonus, ranks: skill.ranks ?? 0, unskilled: false };
  }

  /**
   * The skill in the breakdown (workspace spec 052): by its id with its ranks, or `unskilled` (-25) when the sheet
   * does not have it. Both come from the `skill` source, whose explanation says where the bonus comes from.
   */
  static skillModifier(skill: ManeuverSkillBonus): KeyValueModifier {
    const specialization: ModifierParams = skill.specialization ? { specialization: skill.specialization } : {};
    return skill.unskilled
      ? new KeyValueModifier('unskilled', skill.bonus, 'skill', 'skill', MANEUVER_RULES.unskilled, {
          skill: skill.skillId,
          ...specialization,
        })
      : new KeyValueModifier(skill.skillId, skill.bonus, 'skill', 'skill', MANEUVER_RULES.skill, { ranks: skill.ranks, ...specialization });
  }

  /** Hit points, stun, criticals, fatigue, non-violent…: one `penalty-<source>` entry per source, as in attacks. */
  private addActorPenalties(base: ManeuverBaseModifier[], actorRound: ActorRound, withoutFortitude: boolean): void {
    (withoutFortitude ? actorRound.getPenaltiesWithoutFortitude() : actorRound.getPenaltiesBySource()).forEach(({ source, value }) =>
      base.push({ key: `penalty-${source}`, value, source: 'actor-round', group: 'penalty' }),
    );
  }

  /**
   * Workspace spec 079, decision B3 (§3.4): the bonus of an active Adrenal Focus to a Brawn, Gymnastic or Movement
   * maneuver, and the mental block (-25) an absolute failure of Table 3-4 left on the skill.
   */
  private addAdrenalModifiers(base: ManeuverBaseModifier[], actorRound: ActorRound, skillId: string, categoryId: string | null): void {
    const focus = actorRound.adrenalFocusBonus?.() ?? 0;
    if (focus > 0 && categoryId && ADRENAL_FOCUS_CATEGORIES.includes(categoryId)) {
      base.push({
        key: 'adrenal-focus',
        value: focus,
        source: 'actor-round',
        group: 'situation',
        rule: MANEUVER_RULES.adrenal,
        params: { category: categoryId },
      });
    }
    const block = actorRound.adrenalBlockPenalty?.(skillId) ?? 0;
    if (block < 0) {
      base.push({
        key: 'adrenal-block',
        value: block,
        source: 'actor-round',
        group: 'penalty',
        rule: MANEUVER_RULES.adrenal,
        params: { skill: skillId },
      });
    }
  }

  /**
   * §5.1 and §7.2: the armor maneuver penalty and the encumbrance penalty of the sheet, and the breakage the armor took
   * in the game (spec 019, decision 10), which the sheet does not count yet.
   */
  private addEquipmentPenalties(base: ManeuverBaseModifier[], character: ActorSheet, actorRound: ActorRound): void {
    const equipment = { source: 'equipment' as const, group: 'penalty' as const };
    base.push({ key: 'armor-maneuver', value: character.equipment?.maneuverPenalty || 0, ...equipment, rule: MANEUVER_RULES.armor });
    base.push({ key: 'encumbrance', value: character.equipment?.encumbrancePenalty || 0, ...equipment, rule: MANEUVER_RULES.encumbrance });
    base.push({ key: 'item-breakage', value: actorRound.getArmorBreakagePenalty?.() || 0, ...equipment, rule: MANEUVER_RULES.breakage });
  }

  /**
   * Table 5-3: the pace of the free movement the maneuver is made during (workspace spec 080; `params.source` and
   * `params.movementId` when it comes from one). An instantaneous action skips sprint and dash, and says so. Workspace spec 079, D1: an
   * Uncoordinated actor counts the pace one faster per tier (`uncoordinated`, apart), -25 more per pace beyond run; only
   * the pace it moved at (sprint, dash) leaves no room for the maneuver.
   */
  private addPacePenalty(
    base: ManeuverBaseModifier[],
    skipped: SkippedRule[],
    pace: Pace | null,
    freeAction: boolean,
    uncoordinatedTier = 0,
    movementId: string | null = null,
  ): void {
    if (!pace) {
      return;
    }
    if (FULL_ROUND_PACES.has(pace)) {
      // Only an instantaneous action fits in a sprint or dash; Table 5-3 gives it no penalty.
      if (!freeAction) {
        throw new ValidationError(`An actor moving at pace '${pace}' cannot perform other actions`, 'err-maneuver-invalid-pace');
      }
      skipped.push(new SkippedRule('pace', 'situation', 'pace-instant-action', MANEUVER_PHASE, MANEUVER_RULES.pace, { pace }));
      return;
    }
    const penalty = pacePenaltyFor(pace);
    base.push({
      key: 'pace',
      value: penalty,
      source: 'movement',
      group: 'situation',
      rule: MANEUVER_RULES.pace,
      params: movementId ? { pace, source: FREE_MOVEMENT_SOURCE, movementId } : { pace },
    });
    if (uncoordinatedTier > 0) {
      base.push({
        key: UNCOORDINATED,
        value: pacePenaltyFor(pace, uncoordinatedTier) - penalty,
        source: 'movement',
        group: 'situation',
        rule: MANEUVER_RULES.uncoordinated,
        params: { pace, effectivePace: effectivePace(pace, uncoordinatedTier), tier: uncoordinatedTier },
      });
    }
  }

  private addStyleBonuses(base: ManeuverBaseModifier[], actorRound: ActorRound, skillId: string, specialization: string | null): void {
    STYLE_SKILL_BONUSES.filter(
      bonus =>
        bonus.skillId === skillId &&
        (!bonus.specialization || bonus.specialization === specialization) &&
        !!activeStyleAbility(actorRound.activeStyle, bonus.abilityId),
    ).forEach(bonus =>
      base.push({
        key: `style-ability-${bonus.abilityId}`,
        value: bonus.value,
        source: 'actor-round',
        group: 'situation',
        params: { style: bonus.abilityId },
      }),
    );
  }

  /** §8.1: -25 per AP below the maximum of the profile's range (no penalty when the skill has no AP range). */
  private addActionPointsPenalty(base: ManeuverBaseModifier[], profile: SkillManeuverProfile, actionPoints: number | null): void {
    if (!profile.actionPoints || actionPoints === null || actionPoints === undefined) {
      return;
    }
    const apProfile = ActionApProfile.forManeuver(profile.actionPoints);
    base.push({
      key: 'action-points',
      value: apProfile.penaltyFor(actionPoints),
      source: 'action',
      group: 'situation',
      rule: MANEUVER_RULES.actionPoints,
      params: { ap: actionPoints, max: profile.actionPoints.max },
    });
  }
}
