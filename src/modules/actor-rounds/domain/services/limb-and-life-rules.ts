import { randomUUID } from 'crypto';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import {
  buildInjury,
  type BodySide,
  type Injury,
  type InjurySource,
  type InjuryType,
  type MedicalResult,
} from '../value-objects/injury.vo.js';
import type { LostLimbLocation } from '../value-objects/lost-limb.vo.js';

/**
 * Workspace spec 079, C1 and C6 (Core Law §13.1 Amputation, §13.2 Life & Death): only numbers and short paraphrases,
 * the rule text stays in the book.
 */
export const AMPUTATION_RULE = '§13.1';
export const REVIVE_RULE = '§13.2';

/** In combat only the emergency amputation (tourniquet, cut and cauterize) at -30; the surgical one (-50) is strategic. */
export const EMERGENCY_AMPUTATION_DIFFICULTY = -30;
export const AMPUTATION_INJURY_PENALTY = -40;
const STUMP_INJURY_TYPES: InjuryType[] = ['bone', 'muscle-tendon', 'skin-tissue', 'cut-burn'];
/** A failure harms the limb more: a D Slash critical, one result lower than the roll gives. */
export const AMPUTATION_FAILURE_CRITICAL = { criticalType: 'S', criticalSeverity: 'D', resultShift: -1 } as const;
/** An absolute failure is system shock: dying in 2d10 rounds. */
export const SYSTEM_SHOCK_DICE = 2;

/** §13.2: the soul departs five minutes after the death, 60 rounds of 5 seconds. */
export const SOUL_DEPARTURE_ROUNDS = 60;

/**
 * Reviving a body (§13.2): Medicine at -50 for a respiratory arrest, at -100 for a cardiac one, and defibrillation
 * between -20 and -70 by the quality of the source (an electricity critical when the source is dangerous).
 */
export type ReviveMethod = 'respiratory' | 'cardiac' | 'defibrillation';
export const REVIVE_METHODS: ReviveMethod[] = ['respiratory', 'cardiac', 'defibrillation'];
export const REVIVE_DIFFICULTY: Record<Exclude<ReviveMethod, 'defibrillation'>, number> = { respiratory: -50, cardiac: -100 };
export const DEFIBRILLATION_DIFFICULTY_RANGE = { min: -70, max: -20 } as const;
/** Without a difficulty, defibrillation is Very Hard (the best source). */
export const DEFAULT_DEFIBRILLATION_DIFFICULTY = -20;

/** Table 13-2a by the result of the medical table: the electricity critical (L) and the d10 of hits of a dangerous source. */
const DEFIBRILLATION_SHOCK: Record<MedicalResult, { severity: string; dice: number } | null> = {
  'absolute-failure': { severity: 'D', dice: 4 },
  failure: { severity: 'C', dice: 3 },
  'partial-success': { severity: 'B', dice: 2 },
  success: { severity: 'A', dice: 1 },
  'absolute-success': null,
};
export const ELECTRICITY_CRITICAL = 'L';

const D10 = 10;

export class LimbAndLifeRules {
  /** The stump of an emergency amputation: -40 bone, muscle and skin injuries plus the burn of its cauterization. */
  static stumpInjuries(location: LostLimbLocation, side: BodySide, source: InjurySource, now = new Date()): Injury[] {
    return STUMP_INJURY_TYPES.map(type =>
      buildInjury({
        id: randomUUID(),
        type,
        location,
        side,
        penalty: AMPUTATION_INJURY_PENALTY,
        // A non-surgical amputation always leaves permanent harm unless the permanent roll is an absolute success
        flags: ['permanent-risk'],
        description: 'amputation',
        source,
        createdAt: now,
      }),
    );
  }

  static reviveDifficulty(method: ReviveMethod, defibrillationDifficulty?: number | null): number {
    if (method !== 'defibrillation') return REVIVE_DIFFICULTY[method];
    const value = defibrillationDifficulty ?? DEFAULT_DEFIBRILLATION_DIFFICULTY;
    const { min, max } = DEFIBRILLATION_DIFFICULTY_RANGE;
    if (!Number.isInteger(value) || value < min || value > max) {
      throw new ValidationError(`The difficulty of a defibrillation goes from ${min} to ${max}`, 'err-revive-invalid-difficulty');
    }
    return value;
  }

  /** The body breathes again: a success; a defibrillation also restarts the heart on a partial success (Table 13-2a). */
  static revives(method: ReviveMethod, result: MedicalResult): boolean {
    if (result === 'success' || result === 'absolute-success') return true;
    return method === 'defibrillation' && result === 'partial-success';
  }

  /** The electricity critical and hits of a defibrillation with a dangerous source (none otherwise, or on an absolute success). */
  static defibrillationShock(result: MedicalResult): { severity: string; dice: number } | null {
    return DEFIBRILLATION_SHOCK[result];
  }

  /** The client's sum of `dice` d10 (it has to be a possible one), or a roll made here. */
  static d10(dice: number, roll: number | undefined | null, random: () => number = Math.random): number {
    if (dice <= 0) return 0;
    if (roll === undefined || roll === null) {
      return Array.from({ length: dice }, () => Math.floor(random() * D10) + 1).reduce((sum, die) => sum + die, 0);
    }
    if (!Number.isInteger(roll) || roll < dice || roll > dice * D10) {
      throw new ValidationError(`The roll is ${dice}d10: from ${dice} to ${dice * D10}`, 'err-invalid-dice-roll');
    }
    return roll;
  }
}
