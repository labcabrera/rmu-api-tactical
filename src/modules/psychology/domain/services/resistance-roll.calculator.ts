import { ValidationError } from '../../../shared/domain/errors/errors.js';
import { type FailureSeverity, type FearState, findBand, type PsychologyTables } from '../value-objects/psychology-tables.vo.js';

/**
 * Kinds of resistance roll tactical makes (workspace spec 022, decision 8): fear, physical for an actor dying in
 * frenzy (workspace spec 040), and poison (workspace spec 042).
 */
export type ResistanceKind = 'fear' | 'physical' | 'poison';
export const RESISTANCE_KINDS: ResistanceKind[] = ['fear', 'physical', 'poison'];

/** What a resistance roll is for, when it changes the actor (workspace spec 040: the RR of a frenzy-dying actor). */
export type ResistanceReason = 'frenzy-dying';
export const RESISTANCE_REASONS: ResistanceReason[] = ['frenzy-dying'];

export interface ResistanceModifier {
  key: string;
  value: number;
}

export interface ResistanceRollInput {
  kind: ResistanceKind;
  /** The open-ended roll. */
  roll: number;
  /** The actor's resistance roll bonus of the kind (it already has the +2 per level of the target). */
  bonus: number;
  /** Level of the attack: the fright level for fear. */
  attackLevel: number;
  modifiers?: ResistanceModifier[];
  /** Penalties of the actor (negative): left out of a fear RR when core says so. */
  penalty?: number;
}

export interface ResistanceRollResult {
  kind: ResistanceKind;
  roll: number;
  /** Every term of the total: roll, bonus, attack level, penalties and the other modifiers. */
  breakdown: ResistanceModifier[];
  total: number;
  required: number;
  resisted: boolean;
  /** How much the total fell short of the required one; 0 when it resisted. */
  failure: number;
  /** Severity key of Table 5-6 (`mild-failure`...), missing when it resisted. */
  result?: string;
  severity?: FailureSeverity;
  /** Fear: the state the failure puts the actor in (Table 14-3a) and its rally modifier. */
  fearState?: FearState;
  rallyModifier?: number;
}

/**
 * A resistance roll (§5.6, Table 5-6), computed here from the rules and bands of core's psychology tables rather than
 * with a call to core per actor: d100OE + the actor's bonus (stat, race, realm and 2 per own level, as strategic sums
 * it) + modifiers - 2 x attack level, against the required total. The failure margin gives the severity and, for
 * fear, the fear state. Injury and fatigue penalties do not apply to a fear RR (§14.3) unless core says otherwise.
 */
export class ResistanceRollCalculator {
  static resolve(input: ResistanceRollInput, tables: PsychologyTables): ResistanceRollResult {
    if (!Number.isFinite(input.roll) || !Number.isFinite(input.attackLevel) || !Number.isFinite(input.bonus)) {
      throw new ValidationError('A resistance roll needs a roll, a bonus and an attack level', 'err-resistance-roll-invalid');
    }
    const rules = tables.resistanceRoll;
    const breakdown: ResistanceModifier[] = [
      { key: 'roll', value: input.roll },
      { key: `${input.kind}-rr`, value: input.bonus },
      { key: 'attack-level', value: rules.attackLevelMultiplier * input.attackLevel },
    ];
    const ignoresPenalties = input.kind === 'fear' && rules.fearIgnoresInjuryPenalties !== false;
    if (!ignoresPenalties && input.penalty) {
      breakdown.push({ key: 'penalty', value: Math.min(0, input.penalty) });
    }
    (input.modifiers ?? []).filter(modifier => modifier.value).forEach(modifier => breakdown.push({ ...modifier }));
    const total = breakdown.reduce((sum, modifier) => sum + modifier.value, 0);
    const required = rules.requiredTotal;
    const failure = Math.max(0, required - total);
    const result: ResistanceRollResult = {
      kind: input.kind,
      roll: input.roll,
      breakdown,
      total,
      required,
      resisted: failure === 0,
      failure,
    };
    if (failure === 0) {
      return result;
    }
    const band = findBand(tables.resistance, failure);
    if (band) {
      result.result = band.result;
      result.severity = band.severity;
    }
    if (input.kind === 'fear') {
      const fear = findBand(tables.fearResults, failure);
      if (fear) {
        result.fearState = fear.result;
        result.rallyModifier = fear.rallyModifier;
        result.severity = result.severity ?? fear.severity;
      }
    }
    return result;
  }
}
