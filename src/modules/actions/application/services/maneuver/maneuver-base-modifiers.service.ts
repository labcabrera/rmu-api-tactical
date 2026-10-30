import { Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { activeStyleAbility } from '../../../../actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Character } from '../../../../strategic/application/ports/character.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { KeyValueModifier, type ModifierGroup, type ModifierParams } from '../../../domain/value-objects/key-value-modifier.vo.js';
import { SkippedRule } from '../../../domain/value-objects/skipped-rule.vo.js';
import { AP_PENALTY_PER_MISSING, ActionApProfile } from '../../../domain/value-objects/action-ap-profile.vo.js';
import type { SkillManeuverProfile } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { Pace } from '../../../domain/value-objects/pace.vo.js';
import { toOptionalKey } from '../../../../shared/domain/services/key.js';

/** Bonus of a character without the skill (chapter 3). */
export const UNSKILLED_BONUS = -25;

/** §8.1: penalty per action point below the maximum of the action's range. */
export const ACTION_POINT_PENALTY = AP_PENALTY_PER_MISSING;

/** Table 5-3: penalty of the pace to the other actions of the round. */
const PACE_PENALTIES: Record<string, number> = {
  creep: 0,
  walk: -25,
  jog: -50,
  run: -75,
};

/** Table 5-3 gives only an AP cost for these paces: the whole round goes into moving. */
const FULL_ROUND_PACES = new Set(['sprint', 'dash']);

/** Paces from slowest to fastest. */
const PACE_ORDER: Pace[] = ['creep', 'walk', 'jog', 'run', 'sprint', 'dash'];

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
  conflict: '§8.2',
  frenzy: '§3.4',
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
  character: Character;
  profile: SkillManeuverProfile;
  skillId: string;
  specialization?: string | null;
  /** AP the action takes, for the AP shortfall. Null skips it. */
  actionPoints: number | null;
  /** The action is an instantaneous one (a sprint or a dash still allows it). */
  freeAction?: boolean;
  /** Fastest pace the actor moved at in the current round. */
  pace: Pace | null;
  /** False for the movement roll itself: the pace penalty does not affect it (§5.3). */
  includePace: boolean;
}

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
    this.addActorPenalties(base, input.actorRound);
    if (input.profile.movement) {
      this.addEquipmentPenalties(base, input.character, input.actorRound);
    }
    if (input.includePace) {
      this.addPacePenalty(base, skipped, input.pace, !!input.freeAction);
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
   * A character without the skill, or without that specialization, rolls with -25.
   */
  static skillBonus(character: Character, skillId: string, specialization: string | null): ManeuverSkillBonus {
    const entries = (character.skills || []).filter(s => s.skillId === skillId);
    // Spec 050: sheets store catalog keys; a caller or a sheet not yet migrated may send the name (`Black Speech`)
    const wanted = toOptionalKey(specialization);
    const skill =
      entries.find(s => toOptionalKey(s.specialization) === wanted) ??
      (specialization ? entries.find(s => !s.specialization && !entries.some(other => !!other.specialization)) : undefined);
    if (!skill) {
      return { skillId, specialization, bonus: UNSKILLED_BONUS, ranks: 0, unskilled: true };
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

  /** Fastest pace of the actor's movement actions in the round (only resolved ones carry a pace). */
  static roundPace(actions: Action[], actorId: string, round: number): Pace | null {
    const paces = actions
      .filter(action => action.actorId === actorId && action.round === round && action.actionType === 'movement')
      .map(action => action.movement?.modifiers?.pace)
      .filter((pace): pace is Pace => !!pace && PACE_ORDER.includes(pace));
    if (paces.length === 0) {
      return null;
    }
    return paces.reduce((fastest, pace) => (PACE_ORDER.indexOf(pace) > PACE_ORDER.indexOf(fastest) ? pace : fastest));
  }

  /** Hit points, stun, criticals, fatigue, non-violent…: one `penalty-<source>` entry per source, as in attacks. */
  private addActorPenalties(base: ManeuverBaseModifier[], actorRound: ActorRound): void {
    actorRound
      .getPenaltiesBySource()
      .forEach(({ source, value }) => base.push({ key: `penalty-${source}`, value, source: 'actor-round', group: 'penalty' }));
  }

  /**
   * §5.1 and §7.2: the armor maneuver penalty and the encumbrance penalty of the sheet, and the breakage the armor took
   * in the game (spec 019, decision 10), which the sheet does not count yet.
   */
  private addEquipmentPenalties(base: ManeuverBaseModifier[], character: Character, actorRound: ActorRound): void {
    const equipment = { source: 'equipment' as const, group: 'penalty' as const };
    base.push({ key: 'armor-maneuver', value: character.equipment?.maneuverPenalty || 0, ...equipment, rule: MANEUVER_RULES.armor });
    base.push({ key: 'encumbrance', value: character.equipment?.encumbrancePenalty || 0, ...equipment, rule: MANEUVER_RULES.encumbrance });
    base.push({ key: 'item-breakage', value: actorRound.getArmorBreakagePenalty?.() || 0, ...equipment, rule: MANEUVER_RULES.breakage });
  }

  /** Table 5-3: the fastest pace of the round. An instantaneous action skips it, and says so. */
  private addPacePenalty(base: ManeuverBaseModifier[], skipped: SkippedRule[], pace: Pace | null, freeAction: boolean): void {
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
    base.push({
      key: 'pace',
      value: PACE_PENALTIES[pace] ?? 0,
      source: 'movement',
      group: 'situation',
      rule: MANEUVER_RULES.pace,
      params: { pace },
    });
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
