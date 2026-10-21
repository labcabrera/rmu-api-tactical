import type { HpBySource, HpLogEntry } from '../../../actor-rounds/domain/value-objets/hp-log-entry.vo';
import type { CharacterCondition, Injury } from '../../../actor-rounds/domain/value-objets/injury.vo';

/** What a character at risk (bleeding or dying) ends the game as, chosen when it is finished (spec 013, §3). */
export type CharacterFate = 'dead' | 'permanent-unconscious';
export const CHARACTER_FATES: CharacterFate[] = ['dead', 'permanent-unconscious'];

export interface ActorFate {
  actorId: string;
  fate: CharacterFate;
}

/** The outcome of one character of a finished game, sent to the strategic API by `apply`. */
export interface TacticalGameOutcomeCharacter {
  actorId: string;
  characterId: string;
  name: string;
  /** `delta = end - start`. */
  hp: { start: number; end: number; delta: number };
  /** Every change of the hits in the game, by round (spec 013, §1.1). Missing in outcomes stored before it existed. */
  hpLog?: HpLogEntry[];
  /** Totals of `hpLog` by kind and by attacker. */
  hpBySource?: HpBySource;
  /** Final state of every injury of the actor. */
  injuries: Injury[];
  injuriesAdded: string[];
  injuriesUpdated: string[];
  injuriesHealed: string[];
  /** Dead, unconscious or permanently unconscious at the end. */
  conditions: CharacterCondition[];
  /** Conditions the character brought that ended in the game (such as waking up). */
  conditionsResolved: string[];
  fate?: CharacterFate;
  appliedAt?: string;
  error?: string;
}

export interface TacticalGameOutcome {
  finishedAt: string;
  appliedAt?: string;
  characters: TacticalGameOutcomeCharacter[];
}

/** A character that dies when the game ends unless the game master chooses otherwise (spec 013, decision 2). */
export interface AtRiskActor {
  actorId: string;
  characterId: string;
  name: string;
  /** Hits per round of its injuries. */
  bleeding: number;
  /** Rounds left of its dying effect, when it has one. */
  dyingRounds?: number;
}
