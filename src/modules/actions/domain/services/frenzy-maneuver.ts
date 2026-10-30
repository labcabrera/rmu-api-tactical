import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { activeStyleAbility } from '../../../actor-rounds/domain/value-objects/actor-round-fighting-style.vo.js';
import { FRENZY_GREATER_TRAIT, FRENZY_TRAIT } from '../../../actor-rounds/domain/value-objects/actor-round-trait.vo.js';
import { UnprocessableEntityError } from '../../../shared/domain/errors/errors.js';
import { KeyValueModifier } from '../value-objects/key-value-modifier.vo.js';
import type { FrenzyPurpose } from '../value-objects/frenzy-purpose.vo.js';

/** Skill of the maneuvers that enter and leave the frenzy (Core Law §4, Adrenal Focus). */
export const ADRENAL_FOCUS_SKILL_ID = 'adrenal-focus';
/** Greater Frenzy: entering it and leaving it are Extremely Hard (-30 on top of the difficulty). */
const GREATER_FRENZY_MODIFIER = -30;
/** Improved Frenzy (fighting style ability): +10 to enter or leave the frenzy. */
const IMPROVED_FRENZY_BONUS = 10;
const IMPROVED_FRENZY = 'improved-frenzy';
/** Results of an absolute maneuver that succeed (§5.1). */
const SUCCESS_RESULTS = ['success', 'absolute-success'];

/**
 * The actor can make the frenzy maneuver (workspace spec 040, decisions 8-9): an Adrenal Focus roll, the Frenzy talent
 * to enter (Greater Frenzy for the greater one), and a frenzy to leave.
 */
export const validateFrenzyPurpose = (actorRound: ActorRound, skillId: string, purpose: FrenzyPurpose): void => {
  if (skillId !== ADRENAL_FOCUS_SKILL_ID) {
    throw new UnprocessableEntityError('Only an Adrenal Focus maneuver enters or leaves the frenzy', 'err-frenzy-skill');
  }
  const level = actorRound.frenzyLevel();
  if (purpose === 'frenzy-exit') {
    if (level === 0) throw new UnprocessableEntityError('The actor is not in frenzy', 'err-frenzy-not-in-frenzy');
    return;
  }
  const greater = actorRound.traitTier(FRENZY_GREATER_TRAIT) > 0;
  if (purpose === 'frenzy-enter-greater' && !greater) {
    throw new UnprocessableEntityError('The actor has not the Greater Frenzy talent', 'err-frenzy-without-trait');
  }
  if (!greater && actorRound.traitTier(FRENZY_TRAIT) === 0) {
    throw new UnprocessableEntityError('The actor has not the Frenzy talent', 'err-frenzy-without-trait');
  }
  if (level >= (purpose === 'frenzy-enter-greater' ? 2 : 1)) {
    throw new UnprocessableEntityError('The actor is already in frenzy', 'err-frenzy-already');
  }
};

/** Modifiers of the frenzy maneuver: Greater Frenzy -30 to enter or leave it, Improved Frenzy +10. */
export const frenzyManeuverModifiers = (actorRound: ActorRound, purpose: FrenzyPurpose): KeyValueModifier[] => {
  const modifiers: KeyValueModifier[] = [];
  const greater = purpose === 'frenzy-enter-greater' || (purpose === 'frenzy-exit' && actorRound.frenzyLevel() === 2);
  if (greater) {
    modifiers.push(new KeyValueModifier('frenzy-greater', GREATER_FRENZY_MODIFIER, 'situation', 'frenzy', '§3.4'));
  }
  if (activeStyleAbility(actorRound.activeStyle, IMPROVED_FRENZY)) {
    modifiers.push(new KeyValueModifier(IMPROVED_FRENZY, IMPROVED_FRENZY_BONUS, 'situation', 'frenzy'));
  }
  return modifiers;
};

/**
 * Applies a resolved frenzy maneuver to the actor: on a success or better it enters the frenzy (or the greater one) or
 * leaves it. Answers whether the frenzy changed.
 */
export const applyFrenzyManeuver = (
  actorRound: ActorRound,
  purpose: FrenzyPurpose,
  result: string | undefined,
  application: { phase: number; spentAp: number },
): boolean => {
  if (!result || !SUCCESS_RESULTS.includes(result)) {
    return false;
  }
  if (purpose === 'frenzy-exit') {
    actorRound.leaveFrenzy();
  } else {
    actorRound.enterFrenzy(purpose === 'frenzy-enter-greater' ? 2 : 1, application);
  }
  return true;
};
