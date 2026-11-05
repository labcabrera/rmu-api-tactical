import type { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import type { ActorRoundEffect } from '../../../actor-rounds/domain/value-objects/actor-round-effect.vo.js';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors/errors.js';
import type { Difficulty } from '../value-objects/difficulty.vo.js';
import { KeyValueModifier } from '../value-objects/key-value-modifier.vo.js';

/**
 * Skills of an escape from a grapple (workspace spec 077, decision A3.3): Wrestling, a specialization of the unarmed
 * skills (`unarmed-st` or `unarmed-ag`), or Contortions.
 */
export const GRAPPLE_ESCAPE_SKILLS = ['unarmed-st', 'unarmed-ag', 'contortions'];

/** Contortions: its absolute failure tightens the grapple (decision A3.6). */
export const CONTORTIONS_SKILL_ID = 'contortions';

/** An escape takes 2 to 4 AP, -25 per AP below 4 (decision A3.3). */
export const GRAPPLE_ESCAPE_AP = { min: 2, max: 4 };

/** Rule of the contested maneuvers (§8.2), as the conflict of the other maneuvers. */
const CONFLICT_RULE = '§8.2';

/** Difficulty when the game master sends none (decision A3.3, P4): medium, as against an object. */
export const GRAPPLE_ESCAPE_DEFAULT_DIFFICULTY: Difficulty = 'm';

/** One roll of the escape, against one grapple: every grapple of the actor can be rolled in the same action. */
export interface GrappleEscapeRow {
  effectId: string;
  /** Open-ended roll of the actor. */
  roll: number;
  /** The game master's choice (P4): from the relative weight against a grappler, medium against an object. */
  difficulty?: Difficulty;
  /** Total of the grappler's side of the contested roll: required unless the grapple is an object. */
  passiveTotal?: number;
}

/**
 * The actor can try to escape (decision A3.3): a Wrestling or Contortions roll (`err-maneuver-purpose-skill`), one row
 * per grapple at most (`err-grapple-escape-required`), each a grapple of the actor it can still escape from
 * (`err-grapple-not-grappled`, `err-grapple-effect-not-found`, `err-grapple-escape-blocked`), and the grappler's total
 * against a grappler (`err-maneuver-passive-roll-required`). Answers the grapple of each row.
 */
export const validateGrappleEscape = (
  actorRound: ActorRound,
  skillId: string,
  rows: GrappleEscapeRow[] | undefined,
): ActorRoundEffect[] => {
  if (!GRAPPLE_ESCAPE_SKILLS.includes(skillId)) {
    throw new UnprocessableEntityError(`A grapple escape rolls ${GRAPPLE_ESCAPE_SKILLS.join(' or ')}`, 'err-maneuver-purpose-skill', {
      skillId: GRAPPLE_ESCAPE_SKILLS[0],
    });
  }
  if (actorRound.grapples().length === 0) {
    throw new ValidationError('The actor is not grappled', 'err-grapple-not-grappled');
  }
  const ids = (rows ?? []).map(row => row.effectId);
  if (ids.length === 0 || new Set(ids).size !== ids.length) {
    throw new ValidationError('Send one roll for each grapple to escape from', 'err-grapple-escape-required');
  }
  return rows!.map(row => {
    const grapple = actorRound.findGrapple(row.effectId);
    if (!isObjectGrapple(grapple) && (row.passiveTotal === undefined || row.passiveTotal === null)) {
      throw new ValidationError('The total of the grappler is required', 'err-maneuver-passive-roll-required');
    }
    return grapple;
  });
};

/** A net, a vine or a rope: no grappler resists. */
export const isObjectGrapple = (grapple: ActorRoundEffect): boolean => !!grapple.data?.object || !grapple.targetActorId;

/** Decision A3.3: 100 less the grappler's total; nothing against an object. */
export const grappleConflictModifier = (grapple: ActorRoundEffect, row: GrappleEscapeRow): KeyValueModifier | null => {
  if (isObjectGrapple(grapple)) {
    return null;
  }
  const passive = row.passiveTotal!;
  return new KeyValueModifier('conflict', 100 - passive, 'situation', 'conflict', CONFLICT_RULE, { passive });
};
