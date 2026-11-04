import type { ActorRound, EffectApplication } from '../../../actor-rounds/domain/aggregates/actor-round.js';
import { rollProfileOf } from '../../../actor-rounds/domain/value-objects/actor-roll-profile.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';

/** Natural roll of Terrible Luck (the worst failure) and of Spasm (workspace spec 076, decision B10). */
export const TERRIBLE_LUCK_ROLL = 1;
export const SPASM_ROLL = 66;
/** The rounds of a spasm: a d10. */
export const SPASM_DIE = 10;

/** The roll of an action a natural result comes from: a maneuver, an attack (with its name) or a spell. */
export interface NaturalRollOrigin {
  kind: 'maneuver' | 'attack' | 'spell';
  actionId: string;
  attackName?: string;
}

export interface NaturalRollOptions {
  /** Rounds of the spasm (d10) the client rolled; the server rolls them when left out. */
  spasmRounds?: number | null;
  /** When the spasm lands, for its duration; read only when there is a spasm. */
  application?: () => EffectApplication | undefined;
  /** Random source of the spasm die, for tests. */
  random?: () => number;
}

/** What a natural roll did to the actor. */
export interface NaturalRollOutcome {
  terribleLuck: boolean;
  spasm: boolean;
}

/** A spasm lasts the client's d10 (1-10, `err-spasm-rounds-invalid`) or one rolled here. */
export const spasmRoundsOf = (given: number | null | undefined, random: () => number = Math.random): number => {
  if (given === undefined || given === null) {
    return Math.floor(random() * SPASM_DIE) + 1;
  }
  if (!Number.isInteger(given) || given < 1 || given > SPASM_DIE) {
    throw new ValidationError(`A spasm lasts 1 to ${SPASM_DIE} rounds`, 'err-spasm-rounds-invalid');
  }
  return given;
};

/**
 * Workspace spec 076, decision B10 (P5): the natural result of any roll of the actor (maneuver, attack, spell). A
 * natural 01 with Terrible Luck raises the `terrible-luck` alert, for the game master to narrate; a natural 66 with
 * Spasm gives it a spasm. A roll sent again does neither twice. `unmodified` is the first die; without it nothing is
 * known of the natural roll.
 */
export const applyNaturalRoll = (
  actor: ActorRound,
  unmodified: number | null | undefined,
  origin: NaturalRollOrigin,
  options: NaturalRollOptions = {},
): NaturalRollOutcome => {
  const outcome: NaturalRollOutcome = { terribleLuck: false, spasm: false };
  if (unmodified === undefined || unmodified === null) {
    return outcome;
  }
  const profile = rollProfileOf(actor.traits);
  if (profile.terribleLuck && unmodified === TERRIBLE_LUCK_ROLL) {
    outcome.terribleLuck = actor.addTerribleLuckAlert(origin.kind, origin.actionId, origin.attackName);
  }
  if (profile.spasm && unmodified === SPASM_ROLL) {
    const key = [origin.kind, origin.actionId, origin.attackName].filter(Boolean).join(':');
    outcome.spasm = actor.addSpasm(spasmRoundsOf(options.spasmRounds, options.random), key, options.application?.());
  }
  return outcome;
};
