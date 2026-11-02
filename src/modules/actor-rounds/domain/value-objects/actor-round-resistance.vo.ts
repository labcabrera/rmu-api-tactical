/** Resistance roll types (Table 5-6). */
export type ResistanceType = 'physical' | 'fear' | 'channeling' | 'essence' | 'mentalism';

export const RESISTANCE_TYPES: ResistanceType[] = ['physical', 'fear', 'channeling', 'essence', 'mentalism'];

/**
 * A resistance roll bonus of the actor (workspace spec 022, decision 8): the total of its strategic character sheet
 * (stat, race, realm, traits and level), copied when round 1 is built from it.
 */
export interface ActorRoundResistance {
  resistance: string;
  totalBonus: number;
}
