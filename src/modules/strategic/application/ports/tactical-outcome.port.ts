import type { HpBySource, HpLogEntry } from '../../../actor-rounds/domain/value-objets/hp-log-entry.vo';
import type { CharacterCondition, Injury } from '../../../actor-rounds/domain/value-objets/injury.vo';

/** One character of a finished tactical game, as the strategic API takes it (spec 013, §3 and §4). */
export interface TacticalOutcomeRequest {
  tacticalGameId: string;
  tacticalGameName: string;
  actorId: string;
  characterId: string;
  name: string;
  hp: { start: number; end: number; delta: number };
  /** Every change of the hits in the game (spec 013, §1.1): strategic keeps it in the healing log, not the character. */
  hpLog?: HpLogEntry[];
  hpBySource?: HpBySource;
  injuries: Injury[];
  injuriesAdded: string[];
  injuriesUpdated: string[];
  injuriesHealed: string[];
  conditions: CharacterCondition[];
  fate?: 'dead' | 'permanent-unconscious';
}

export interface TacticalOutcomePort {
  /** `POST /characters/:id/tactical-outcomes`. Idempotent: the strategic API answers 200 when it was already applied. */
  apply(characterId: string, request: TacticalOutcomeRequest): Promise<void>;
}
