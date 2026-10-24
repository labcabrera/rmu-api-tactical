import { Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import type { Character } from '../../../../strategic/application/ports/character.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { AP_PENALTY_PER_MISSING, ActionApProfile } from '../../../domain/value-objects/action-ap-profile.vo.js';
import type { SkillManeuverProfile } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { Pace } from '../../../domain/value-objects/pace.vo.js';

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

/** Where a base modifier comes from. */
export type ManeuverBaseSource = 'actor-round' | 'equipment' | 'movement' | 'action';

export interface ManeuverBaseModifier {
  key: string;
  value: number;
  source: ManeuverBaseSource;
}

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
}

/**
 * Base modifiers of a maneuver (§5.1, §5.3, §8.1 and chapter 3): what the rules apply on their own from the actor's
 * round, its sheet and the skill's maneuver profile. The formulas are rule constants; the profile comes from core.
 */
@Injectable()
export class ManeuverBaseModifiersService {
  compute(input: ManeuverBaseInput): ManeuverBaseResult {
    const base: ManeuverBaseModifier[] = [];
    this.addActorPenalties(base, input.actorRound);
    if (input.profile.movement) {
      this.addEquipmentPenalties(base, input.character, input.actorRound);
    }
    if (input.includePace) {
      this.addPacePenalty(base, input.pace, !!input.freeAction);
    }
    this.addActionPointsPenalty(base, input.profile, input.actionPoints);
    return {
      skill: ManeuverBaseModifiersService.skillBonus(input.character, input.skillId, input.specialization ?? null),
      base: base.filter(modifier => modifier.value !== 0),
    };
  }

  /**
   * The skill bonus of the sheet with its specialization (a skill the sheet keeps without specializations matches any).
   * A character without the skill, or without that specialization, rolls with -25.
   */
  static skillBonus(character: Character, skillId: string, specialization: string | null): ManeuverSkillBonus {
    const entries = (character.skills || []).filter(s => s.skillId === skillId);
    const skill =
      entries.find(s => (s.specialization || null) === (specialization || null)) ??
      (specialization ? entries.find(s => !s.specialization && !entries.some(other => !!other.specialization)) : undefined);
    if (!skill) {
      return { skillId, specialization, bonus: UNSKILLED_BONUS, ranks: 0, unskilled: true };
    }
    return { skillId, specialization, bonus: skill.totalBonus, ranks: skill.ranks ?? 0, unskilled: false };
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
    actorRound.getPenaltiesBySource().forEach(({ source, value }) => base.push({ key: `penalty-${source}`, value, source: 'actor-round' }));
  }

  /**
   * §5.1 and §7.2: the armor maneuver penalty and the encumbrance penalty of the sheet, and the breakage the armor took
   * in the game (spec 019, decision 10), which the sheet does not count yet.
   */
  private addEquipmentPenalties(base: ManeuverBaseModifier[], character: Character, actorRound: ActorRound): void {
    base.push({ key: 'armor-maneuver', value: character.equipment?.maneuverPenalty || 0, source: 'equipment' });
    base.push({ key: 'encumbrance', value: character.equipment?.encumbrancePenalty || 0, source: 'equipment' });
    base.push({ key: 'item-breakage', value: actorRound.getArmorBreakagePenalty?.() || 0, source: 'equipment' });
  }

  private addPacePenalty(base: ManeuverBaseModifier[], pace: Pace | null, freeAction: boolean): void {
    if (!pace) {
      return;
    }
    if (FULL_ROUND_PACES.has(pace)) {
      // Only an instantaneous action fits in a sprint or dash; Table 5-3 gives it no penalty.
      if (!freeAction) {
        throw new ValidationError(`An actor moving at pace '${pace}' cannot perform other actions`, 'err-maneuver-invalid-pace');
      }
      return;
    }
    base.push({ key: 'pace', value: PACE_PENALTIES[pace] ?? 0, source: 'movement' });
  }

  /** §8.1: -25 per AP below the maximum of the profile's range (no penalty when the skill has no AP range). */
  private addActionPointsPenalty(base: ManeuverBaseModifier[], profile: SkillManeuverProfile, actionPoints: number | null): void {
    if (!profile.actionPoints || actionPoints === null || actionPoints === undefined) {
      return;
    }
    const apProfile = ActionApProfile.forManeuver(profile.actionPoints);
    base.push({ key: 'action-points', value: apProfile.penaltyFor(actionPoints), source: 'action' });
  }
}
