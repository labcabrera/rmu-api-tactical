import { randomUUID } from 'crypto';
import type { ActorRound, EffectApplication } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import {
  ActorRoundEffect,
  BATTLE_CRY,
  BATTLE_CRY_BONUS,
  CRITICAL_REROLL,
  type CriticalRerollKind,
  PRECISION,
} from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import {
  ActorRoundTrait,
  BATTLE_CRY_TRAIT,
  PRECISION_TRAIT,
  SENSE_WEAKNESS,
  STUDY_OFFENSE,
} from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors/errors.js';
import { KeyValueModifier } from '../value-objects/key-value-modifier.vo.js';
import type { CombatTalentPurpose, PrecisionPosition } from '../value-objects/maneuver-purpose.vo.js';

/** What the client chose for the maneuver of a combat talent (workspace spec 076, §2.6). */
export interface CombatTalentChoices {
  /** The foe of Sense Weakness, Study Offense and Precision. */
  foeActorId?: string;
  /** Battle Cry: level of the highest level foe, -2 per level. */
  foeLevel?: number;
  /** Precision: where the attacker stands. */
  position?: PrecisionPosition;
  /** Precision: OB the attacker gives up to make the maneuver easier (0 or more). */
  obPenalty?: number;
}

/** How each maneuver is made: the talent it needs, the skill it rolls, its AP and whether it is against a foe. */
interface PurposeRule {
  traitId: string;
  skillId: string;
  specialization?: string;
  /** AP of the maneuver; undefined for the AP of the skill's profile. */
  ap?: number;
  againstFoe: boolean;
  rule: string;
}

/** Skill of Battle Cry (Influence, intimidation), Sense Weakness and Study Offense (Perception) and Precision (Ambush). */
export const INFLUENCE_SKILL_ID = 'influence';
export const INTIMIDATION_SPECIALIZATION = 'intimidation';
export const PERCEPTION_SKILL_ID = 'perception';
export const AMBUSH_SKILL_ID = 'ambush';

/** A full round of observation (decision P4). */
const FULL_ROUND_AP = 4;
const BATTLE_CRY_AP = 2;
const RULE = 'Character Companion';

const PURPOSE_RULES: Record<CombatTalentPurpose, PurposeRule> = {
  'battle-cry': {
    traitId: BATTLE_CRY_TRAIT,
    skillId: INFLUENCE_SKILL_ID,
    specialization: INTIMIDATION_SPECIALIZATION,
    ap: BATTLE_CRY_AP,
    againstFoe: false,
    rule: RULE,
  },
  'sense-weakness': { traitId: SENSE_WEAKNESS, skillId: PERCEPTION_SKILL_ID, ap: FULL_ROUND_AP, againstFoe: true, rule: RULE },
  'study-offense': { traitId: STUDY_OFFENSE, skillId: PERCEPTION_SKILL_ID, ap: FULL_ROUND_AP, againstFoe: true, rule: RULE },
  precision: { traitId: PRECISION_TRAIT, skillId: AMBUSH_SKILL_ID, againstFoe: true, rule: RULE },
};

/** Battle Cry: -2 per level of the highest level foe. */
const BATTLE_CRY_PER_FOE_LEVEL = -2;
/** Precision: the difficulty by where the attacker stands. */
const PRECISION_POSITION_MODIFIERS: Record<PrecisionPosition, number> = { rear: -50, flank: -70, front: -100 };
/** Results of an absolute maneuver that succeed (§5.1). */
const SUCCESS_RESULTS = ['success', 'absolute-success'];

/** The talent a combat talent maneuver needs. */
export const purposeTraitId = (purpose: CombatTalentPurpose): string => PURPOSE_RULES[purpose].traitId;

/** AP range of the maneuver: 2 for Battle Cry, a full round (4) for Sense Weakness and Study Offense (P4), else none. */
export const combatTalentApRange = (purpose: CombatTalentPurpose): { min: number; max: number } | null => {
  const ap = PURPOSE_RULES[purpose].ap;
  return ap === undefined ? null : { min: ap, max: ap };
};

/**
 * The actor can make the maneuver of a combat talent (workspace spec 076, §2.6): the skill of the talent
 * (`err-maneuver-purpose-skill`), the talent (`err-maneuver-purpose-trait-required`), a foe other than itself when it is
 * against one (`err-maneuver-purpose-target-required`), Battle Cry only in the first round of the actor in the combat
 * (`err-battle-cry-not-first-round`) and Precision with a position (`err-precision-position-required`).
 */
export const validateCombatTalentPurpose = (
  actorRound: ActorRound,
  skill: { skillId: string; specialization?: string | null },
  purpose: CombatTalentPurpose,
  choices: CombatTalentChoices,
  options: { firstRound: boolean },
): void => {
  const rule = PURPOSE_RULES[purpose];
  const otherSpecialization = !!rule.specialization && !!skill.specialization && skill.specialization !== rule.specialization;
  if (skill.skillId !== rule.skillId || otherSpecialization) {
    throw new UnprocessableEntityError(`A ${purpose} maneuver rolls ${rule.skillId}`, 'err-maneuver-purpose-skill', {
      purpose,
      skillId: rule.skillId,
    });
  }
  if (ActorRoundTrait.tierOf(actorRound.traits, rule.traitId) === 0) {
    throw new UnprocessableEntityError(`The actor has not the ${rule.traitId} talent`, 'err-maneuver-purpose-trait-required', {
      purpose,
      traitId: rule.traitId,
    });
  }
  if (rule.againstFoe && (!choices.foeActorId || choices.foeActorId === actorRound.actorId)) {
    throw new ValidationError(`A ${purpose} maneuver is against a foe`, 'err-maneuver-purpose-target-required', { purpose });
  }
  if (purpose === 'battle-cry' && !options.firstRound) {
    throw new UnprocessableEntityError(
      'Battle Cry is only made in the first round of the actor in the combat',
      'err-battle-cry-not-first-round',
    );
  }
  if (purpose === 'precision' && !choices.position) {
    throw new ValidationError('Precision needs the position of the attacker (rear, flank, front)', 'err-precision-position-required');
  }
  if (choices.obPenalty !== undefined && choices.obPenalty !== null && (!Number.isInteger(choices.obPenalty) || choices.obPenalty < 0)) {
    throw new ValidationError('The OB given up by Precision is 0 or more', 'err-maneuver-invalid-modifier');
  }
  if (choices.foeLevel !== undefined && choices.foeLevel !== null && (!Number.isInteger(choices.foeLevel) || choices.foeLevel < 0)) {
    throw new ValidationError('The level of the foe is 0 or more', 'err-maneuver-invalid-modifier');
  }
};

/**
 * Modifiers of the maneuver of a combat talent: Battle Cry -2 per level of the highest level foe; Precision the
 * difficulty of its position (-50 rear, -70 flank, -100 front) and the OB given up, which makes it easier as much.
 */
export const combatTalentModifiers = (purpose: CombatTalentPurpose, choices: CombatTalentChoices): KeyValueModifier[] => {
  const rule = PURPOSE_RULES[purpose].rule;
  const modifiers: KeyValueModifier[] = [];
  if (purpose === 'battle-cry' && (choices.foeLevel ?? 0) > 0) {
    modifiers.push(
      new KeyValueModifier('battle-cry-foe-level', BATTLE_CRY_PER_FOE_LEVEL * choices.foeLevel!, 'situation', purpose, rule, {
        foeLevel: choices.foeLevel!,
      }),
    );
  }
  if (purpose === 'precision' && choices.position) {
    modifiers.push(
      new KeyValueModifier('precision-position', PRECISION_POSITION_MODIFIERS[choices.position], 'situation', purpose, rule, {
        position: choices.position,
      }),
    );
    if ((choices.obPenalty ?? 0) > 0) {
      modifiers.push(new KeyValueModifier('precision-ob-penalty', choices.obPenalty!, 'situation', purpose, rule));
    }
  }
  return modifiers;
};

/** The difficulty of the maneuver: Medium for Battle Cry and Precision (whose position gives it); else the one chosen. */
export const combatTalentDifficulty = <T>(purpose: CombatTalentPurpose, chosen: T | undefined, medium: T): T | undefined =>
  purpose === 'battle-cry' || purpose === 'precision' ? medium : chosen;

/** The maneuver succeeded: a success or better of an absolute one, the task complete of a percent one. */
export const combatTalentSucceeded = (result: { result?: string; completed?: boolean; critical?: string | null } | undefined): boolean => {
  if (!result) return false;
  if (result.result !== undefined && result.result !== null) return SUCCESS_RESULTS.includes(result.result);
  return !!result.completed && !result.critical;
};

/**
 * The effect of a successful maneuver of a combat talent (workspace spec 076, §2.6): Battle Cry (+10 OB and DB for the
 * rest of the combat); Sense Weakness and Study Offense a `critical-reroll` against the foe, of kind `offense` and
 * `defense`, which replaces the one the actor had of that kind; Precision `precision` against the foe, with half the
 * Ambush ranks (rounded down) and the OB given up. Answers the effect added, undefined when the maneuver failed.
 */
export const applyCombatTalentManeuver = (
  actorRound: ActorRound,
  purpose: CombatTalentPurpose,
  succeeded: boolean,
  choices: CombatTalentChoices,
  options: { ambushRanks?: number; application?: EffectApplication },
): ActorRoundEffect | undefined => {
  if (!succeeded) {
    return undefined;
  }
  const effect = buildEffect(purpose, choices, options.ambushRanks ?? 0);
  actorRound.applyAttackResults(undefined, [effect], undefined, options.application);
  return effect;
};

const buildEffect = (purpose: CombatTalentPurpose, choices: CombatTalentChoices, ambushRanks: number): ActorRoundEffect => {
  switch (purpose) {
    case 'battle-cry':
      return new ActorRoundEffect(randomUUID(), BATTLE_CRY, BATTLE_CRY_BONUS, undefined);
    case 'sense-weakness':
    case 'study-offense': {
      const kind: CriticalRerollKind = purpose === 'sense-weakness' ? 'offense' : 'defense';
      const effect = new ActorRoundEffect(randomUUID(), CRITICAL_REROLL, undefined, undefined);
      effect.targetActorId = choices.foeActorId;
      effect.data = { kind };
      return effect;
    }
    case 'precision': {
      const effect = new ActorRoundEffect(randomUUID(), PRECISION, Math.floor(ambushRanks / 2), undefined);
      effect.targetActorId = choices.foeActorId;
      effect.data = { obPenalty: choices.obPenalty ?? 0 };
      return effect;
    }
  }
};
