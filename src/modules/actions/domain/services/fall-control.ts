import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type { Action } from '../aggregates/action.js';
import { FALL_CONTROL } from '../value-objects/maneuver-purpose.vo.js';

/** Skill of the maneuver that controls a fall (§15.4). */
export const ACROBATICS_SKILL_ID = 'acrobatics';

/** Workspace spec 077, P13: controlling a fall is instantaneous and takes 0 AP. */
export const FALL_CONTROL_AP = { min: 0, max: 0 };

/** Skills whose absolute failure suggests a fall (workspace spec 077, decision D5). */
export const FALL_SKILLS = ['climbing', 'jumping'];

/**
 * §15.4: the result of the Acrobatics maneuver moves the severity of the critical of the fall: a success one step down,
 * an absolute success two, an absolute failure one up. Workspace spec 077, P13: a partial success or a failure changes
 * nothing.
 */
export const fallControlSteps = (result: string | undefined): number => {
  switch (result) {
    case 'absolute-failure':
      return 1;
    case 'success':
      return -1;
    case 'absolute-success':
      return -2;
    default:
      return 0;
  }
};

/**
 * A `fall-control` maneuver (workspace spec 077, decision D4): Acrobatics as an absolute maneuver, declared
 * instantaneous or forced by the game master (`err-fall-control-invalid`, with `details.reason`).
 */
export const validateFallControlManeuver = (action: Action, skillId: string, maneuverType: string): void => {
  if (skillId !== ACROBATICS_SKILL_ID) {
    throw new ValidationError('A fall is controlled with Acrobatics', 'err-fall-control-invalid', { reason: 'skill', skillId });
  }
  if (maneuverType !== 'absolute') {
    throw new ValidationError('Controlling a fall is an absolute maneuver', 'err-fall-control-invalid', { reason: 'maneuver-type' });
  }
  if (!action.freeAction && !action.isForced()) {
    throw new ValidationError('Controlling a fall is instantaneous: declare it as an instantaneous action', 'err-fall-control-invalid', {
      reason: 'not-instantaneous',
    });
  }
};

/**
 * The maneuver a fall cites (decision D4): a resolved `fall-control` maneuver of the same actor in the same game
 * (`err-fall-control-invalid`, with `details.reason`). Answers its steps.
 */
export const fallControlStepsOf = (action: Action | null | undefined, gameId: string, actorId: string): number => {
  if (!action || action.gameId !== gameId || action.actorId !== actorId) {
    throw new ValidationError('The fall control is not a maneuver of the actor in this game', 'err-fall-control-invalid', {
      reason: 'not-found',
    });
  }
  const maneuver = action.maneuver;
  if (action.actionType !== 'maneuver' || maneuver?.modifiers.purpose !== FALL_CONTROL) {
    throw new ValidationError('The action is not a fall-control maneuver', 'err-fall-control-invalid', { reason: 'purpose' });
  }
  if (action.status !== 'completed' || maneuver.result?.fallControlSteps === undefined || maneuver.result.fallControlSteps === null) {
    throw new ValidationError('The fall-control maneuver is not resolved', 'err-fall-control-invalid', { reason: 'not-resolved' });
  }
  return maneuver.result.fallControlSteps;
};
