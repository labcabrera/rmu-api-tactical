import { randomUUID } from 'crypto';
import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import {
  ActorRoundEffect,
  ADRENAL_BLOCK,
  ADRENAL_BLOCK_PENALTY,
  ADRENAL_DEFENSE,
  ADRENAL_FOCUS,
  ADRENAL_SPEED,
  ADRENAL_STRENGTH,
  FORTITUDE,
  HOLD,
} from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { Action } from '../aggregates/action.js';
import { SkippedRule } from '../value-objects/skipped-rule.vo.js';
import type { AdrenalManeuverOutcome } from '../value-objects/action-maneuver.vo.js';
import { ADRENAL, FORTITUDE as FORTITUDE_PURPOSE } from '../value-objects/maneuver-purpose.vo.js';

/** The four adrenal moves of Body Discipline (§3.4), by the skill that rolls them. */
export type AdrenalKind = 'defense' | 'focus' | 'speed' | 'strength';

export const ADRENAL_SKILLS: Record<string, AdrenalKind> = {
  'adrenal-defense': 'defense',
  'adrenal-focus': 'focus',
  'adrenal-speed': 'speed',
  'adrenal-strength': 'strength',
};

/** Skill of the Fortitude maneuver (§3.5, Brawn). */
export const FORTITUDE_SKILL_ID = 'fortitude';

/** Result table of the adrenal moves and Fortitude (Table 3-4) in core's maneuver tables. */
export const ADRENAL_RESULT_TABLE = 'adrenal';

/** Fortitude is instantaneous and takes 0 AP (§3.5). */
export const FORTITUDE_AP = { min: 0, max: 0 };

/** Total from which an adrenal maneuver succeeds, and the points of each extra round (Table 3-4). */
const SUCCESS_TOTAL = 101;
const POINTS_PER_EXTRA_ROUND = 20;

/** Full benefit of each move (§3.4): the Defense level, the Focus bonus, the Speed AP and the Strength sizes. */
const FULL_BENEFIT: Record<AdrenalKind, number> = { defense: 2, focus: 25, speed: 2, strength: 1 };
const EFFECT_OF: Record<AdrenalKind, string> = {
  defense: ADRENAL_DEFENSE,
  focus: ADRENAL_FOCUS,
  speed: ADRENAL_SPEED,
  strength: ADRENAL_STRENGTH,
};

/** Fortitude takes off half of the penalties (§3.5): 50 %, 100 % in the first round of an absolute success. */
const FORTITUDE_PERCENT = 50;
/** Extra fatigue of an absolute failure of Fortitude (§3.5). */
export const FORTITUDE_FAILURE_FATIGUE = 20;
/** AP lost in the next round after an absolute failure of Adrenal Speed (§3.4). */
const SPEED_FAILURE_AP = 2;

const SUCCESS = 'success';
const ABSOLUTE_SUCCESS = 'absolute-success';
const PARTIAL_SUCCESS = 'partial-success';
const FAILURE = 'failure';
const ABSOLUTE_FAILURE = 'absolute-failure';

/** Rule references of block B (Core Law). */
export const ADRENAL_RULES = { adrenal: '§3.4, Table 3-4', fortitude: '§3.5, Table 3-4' } as const;

/**
 * Rounds of the benefit of a successful adrenal or Fortitude maneuver (Table 3-4): 1, and 1 more for every full 20 over
 * 101 (101-120 one round, 121-140 two...). A partial success lasts 1 round.
 */
export const adrenalRounds = (total: number): number =>
  total < SUCCESS_TOTAL ? 1 : 1 + Math.floor((total - SUCCESS_TOTAL) / POINTS_PER_EXTRA_ROUND);

/**
 * The cleansing trance of an unusual event of Table 3-4 (an unmodified 66): a success, partial or not, counts as an
 * absolute success and a failure as an absolute failure.
 */
export const unusualAdrenalResult = (result: string | undefined): string | undefined => {
  if (result === SUCCESS || result === PARTIAL_SUCCESS) return ABSOLUTE_SUCCESS;
  if (result === FAILURE) return ABSOLUTE_FAILURE;
  return result;
};

/** Reasons of `err-adrenal-invalid` (`details.reason`). */
export type AdrenalInvalidReason = 'skill' | 'maneuver-type' | 'not-instantaneous';

/**
 * An `adrenal` maneuver rolls one of the four adrenal skills and a `fortitude` one Fortitude, both absolute; Fortitude
 * is instantaneous (declared as an instantaneous action, or forced by the game master). Answers the adrenal kind.
 */
export const validateAdrenalManeuver = (
  action: Action,
  purpose: typeof ADRENAL | typeof FORTITUDE_PURPOSE,
  skillId: string,
  maneuverType: string,
): AdrenalKind | null => {
  const kind = purpose === ADRENAL ? ADRENAL_SKILLS[skillId] : null;
  if (purpose === ADRENAL && !kind) {
    throw new ValidationError('An adrenal move rolls an adrenal skill', 'err-adrenal-invalid', { reason: 'skill', skillId });
  }
  if (purpose === FORTITUDE_PURPOSE && skillId !== FORTITUDE_SKILL_ID) {
    throw new ValidationError('A Fortitude maneuver rolls Fortitude', 'err-adrenal-invalid', { reason: 'skill', skillId });
  }
  if (maneuverType !== 'absolute') {
    throw new ValidationError('An adrenal or Fortitude maneuver is absolute', 'err-adrenal-invalid', { reason: 'maneuver-type' });
  }
  if (purpose === FORTITUDE_PURPOSE && !action.freeAction && !action.isForced()) {
    throw new ValidationError('Fortitude is instantaneous: declare it as an instantaneous action', 'err-adrenal-invalid', {
      reason: 'not-instantaneous',
    });
  }
  return kind;
};

/**
 * Workspace spec 079, decision B3: an adrenal move needs a round of concentration before it (§3.4). Tactical does not
 * check it: the breakdown says whether the actor has a concentration now, for the game master to judge.
 */
export const adrenalConcentrationSkip = (actorRound: ActorRound): SkippedRule =>
  new SkippedRule(
    'adrenal-concentration',
    'situation',
    actorRound.concentration().length > 0 ? 'adrenal-concentration-declared' : 'adrenal-concentration-missing',
    'maneuver',
    ADRENAL_RULES.adrenal,
  );

/** A timed effect of block B: from `fromRound` (none: the current round) for `rounds` rounds. */
const timed = (status: string, value: number, rounds: number, fromRound?: number, data?: Record<string, unknown>) =>
  new ActorRoundEffect(
    randomUUID(),
    status,
    value,
    rounds,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    fromRound,
    undefined,
    data,
  );

/**
 * The benefit of a successful move or Fortitude: `rounds` rounds of `value` from `firstRound` (none: now), the first one
 * doubled on an absolute success (two effects then: the doubled round and the rest, from `nextRound`).
 */
const benefit = (
  status: string,
  value: number,
  rounds: number,
  doubled: boolean,
  firstRound: number | undefined,
  nextRound: number,
  data?: Record<string, unknown>,
): ActorRoundEffect[] => {
  if (!doubled) return [timed(status, value, rounds, firstRound, data)];
  const effects = [timed(status, value * 2, 1, firstRound, data)];
  if (rounds > 1) effects.push(timed(status, value, rounds - 1, nextRound, data));
  return effects;
};

/** What a resolved adrenal or Fortitude maneuver does to its actor. */
export interface AdrenalOutcome {
  effects: ActorRoundEffect[];
  /** The absolute failure put a mental block on the skill. */
  block: boolean;
  /** The absolute success lifted the mental block the skill had. */
  blockLifted: boolean;
  /** Extra fatigue of an absolute failure of Fortitude. */
  fatigue: number;
}

const blockEffect = (skillId: string) =>
  new ActorRoundEffect(
    randomUUID(),
    ADRENAL_BLOCK,
    ADRENAL_BLOCK_PENALTY,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    {
      skillId,
    },
  );

/**
 * Effects of an adrenal move (§3.4, workspace spec 079, decision B3), from the next round (`round` + 1):
 * - success: the full benefit for `adrenalRounds(total)` rounds (twice as many for Defense), the first doubled on an
 *   absolute success;
 * - partial success: half the benefit for 1 round (2 for Defense), nothing for Strength;
 * - absolute failure: the mental block (-25 to the skill for the rest of the combat) and, the next round, no dodge
 *   (Defense), 2 AP lost (Speed) or -1 attack size and a quarter of the weight (Strength).
 */
export const adrenalOutcome = (
  kind: AdrenalKind,
  skillId: string,
  result: string | undefined,
  total: number,
  round: number,
): AdrenalOutcome => {
  const next = round + 1;
  const status = EFFECT_OF[kind];
  const outcome: AdrenalOutcome = { effects: [], block: false, blockLifted: false, fatigue: 0 };
  const durationFactor = kind === 'defense' ? 2 : 1;
  if (result === SUCCESS || result === ABSOLUTE_SUCCESS) {
    const rounds = adrenalRounds(total) * durationFactor;
    outcome.effects = benefit(status, FULL_BENEFIT[kind], rounds, result === ABSOLUTE_SUCCESS, next, next + 1, { skillId });
    outcome.blockLifted = result === ABSOLUTE_SUCCESS;
  } else if (result === PARTIAL_SUCCESS && kind !== 'strength') {
    outcome.effects = [timed(status, Math.floor(FULL_BENEFIT[kind] / 2), durationFactor, next, { skillId, partial: true })];
  } else if (result === ABSOLUTE_FAILURE) {
    outcome.block = true;
    outcome.effects.push(blockEffect(skillId));
    if (kind === 'defense') outcome.effects.push(timed(ADRENAL_DEFENSE, -1, 1, next, { skillId }));
    if (kind === 'speed') outcome.effects.push(timed(HOLD, SPEED_FAILURE_AP, 1, next, { skillId }));
    if (kind === 'strength') outcome.effects.push(timed(ADRENAL_STRENGTH, -1, 1, next, { skillId }));
  }
  return outcome;
};

/**
 * Effects of a Fortitude maneuver (§3.5, workspace spec 079, decision B4), from this round: a success halves the
 * fatigue, hit loss, injury and stun penalties for `adrenalRounds(total)` rounds, an absolute success removes them the
 * first round, a partial success takes a quarter off for 1 round; an absolute failure adds 20 of fatigue (and the mental
 * block of Table 3-4).
 */
export const fortitudeOutcome = (skillId: string, result: string | undefined, total: number, round: number): AdrenalOutcome => {
  const outcome: AdrenalOutcome = { effects: [], block: false, blockLifted: false, fatigue: 0 };
  if (result === SUCCESS || result === ABSOLUTE_SUCCESS) {
    const rounds = adrenalRounds(total);
    outcome.effects = benefit(FORTITUDE, FORTITUDE_PERCENT, rounds, result === ABSOLUTE_SUCCESS, undefined, round + 1, { skillId });
    outcome.blockLifted = result === ABSOLUTE_SUCCESS;
  } else if (result === PARTIAL_SUCCESS) {
    outcome.effects = [timed(FORTITUDE, FORTITUDE_PERCENT / 2, 1, undefined, { skillId, partial: true })];
  } else if (result === ABSOLUTE_FAILURE) {
    outcome.block = true;
    outcome.fatigue = FORTITUDE_FAILURE_FATIGUE;
    outcome.effects.push(blockEffect(skillId));
  }
  return outcome;
};

/**
 * Applies the outcome to the actor: the mental block lifted on an absolute success, the effects added and the fatigue
 * of a failed Fortitude. Answers whether the actor changed.
 */
export const applyAdrenalOutcome = (actorRound: ActorRound, skillId: string, outcome: AdrenalOutcome, gameName?: string): boolean => {
  const lifted = outcome.blockLifted ? actorRound.liftAdrenalBlock(skillId) : false;
  const effects = outcome.effects;
  if (effects.length > 0) {
    actorRound.applyAttackResults(undefined, effects, undefined);
  }
  if (outcome.fatigue > 0) {
    actorRound.addFatiguePenalty(outcome.fatigue, gameName);
  }
  return lifted || effects.length > 0 || outcome.fatigue > 0;
};

/** What the outcome gave, for the result of the action: the benefit's rounds and first round, the block, the fatigue. */
export const adrenalSummary = (kind: AdrenalKind | 'fortitude', outcome: AdrenalOutcome): AdrenalManeuverOutcome => {
  const status = kind === 'fortitude' ? FORTITUDE : EFFECT_OF[kind];
  const benefits = outcome.effects.filter(effect => effect.status === status && (effect.value ?? 0) > 0);
  const summary: AdrenalManeuverOutcome = {
    kind,
    rounds: benefits.reduce((sum, effect) => sum + (effect.rounds ?? 0), 0),
  };
  if (benefits.length > 0 && benefits[0].fromRound !== undefined) summary.fromRound = benefits[0].fromRound;
  if (benefits.length > 1) summary.doubled = true;
  if (benefits.some(effect => effect.data?.partial)) summary.partial = true;
  if (outcome.block) summary.block = true;
  if (outcome.blockLifted) summary.blockLifted = true;
  if (outcome.fatigue > 0) summary.fatigue = outcome.fatigue;
  return summary;
};
