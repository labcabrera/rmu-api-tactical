import { DIFFICULTY_MAP, type Difficulty } from '../../../actions/domain/value-objects/difficulty.vo.js';
import { ValidationError } from '../../../shared/domain/errors/errors.js';
import type {
  CauterizationRow,
  HealingCombatRules,
  TreatmentDifficultyRow,
  TreatmentTables,
} from '../value-objects/treatment-difficulty.vo.js';
import {
  type CastSupport,
  deriveInjurySeverity,
  type HealingType,
  type Injury,
  type InjuryLimits,
  type InjurySeverity,
  type MedicalResult,
  type Pace,
  PACES,
} from '../value-objects/injury.vo.js';

/** Unmodified roll of an unusual event (§5.1). */
const UNUSUAL_EVENT_ROLL = 66;

/**
 * Procedures on an injury that can be done during a tactical game (spec 013, §3); workspace spec 068 adds splints,
 * casts and salves. Surgery is not offered in combat.
 */
export type TacticalProcedure = 'pressure' | 'stitches' | 'tourniquet' | 'cauterize' | 'dress' | 'splint' | 'cast' | 'salve' | 'magic';
export const TACTICAL_PROCEDURES: TacticalProcedure[] = [
  'pressure',
  'stitches',
  'tourniquet',
  'cauterize',
  'dress',
  'splint',
  'cast',
  'salve',
  'magic',
];

/** Procedures that are allowed on an injury that needs surgery (workspace spec 068, decision 11). */
const SURGERY_ALTERNATIVES = ['surgery', 'magic'];

export const MEDICAL_RESULTS: MedicalResult[] = ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'];

/**
 * Difficulty of each procedure when core serves no treatment difficulty table (a core before workspace spec 022), and
 * of magic, which is not a Medicine maneuver and has no row in it.
 */
const LEGACY_PROCEDURE_DIFFICULTY: Record<TacticalProcedure, Difficulty> = {
  pressure: 'e',
  stitches: 'm',
  tourniquet: 'vh',
  cauterize: 'r',
  dress: 'r',
  splint: 'm',
  cast: 'm',
  salve: 'r',
  magic: 'm',
};

/** Defaults of core's treatment rules: cauterizing is harder by 5 per point of bleeding, the head one step (ch. 13). */
const CAUTERIZE_PENALTY_PER_BLEEDING = 5;
const HEAD_DIFFICULTY_STEPS = 1;

/** Direct pressure stops a light bleeding and slows a more serious one by this much (ch. 13). */
const PRESSURE_STOPS_UP_TO = 3;
const PRESSURE_REDUCTION = 4;

/** Penalty added on an absolute failure when core gives none. */
const DEFAULT_WORSENING = 10;

/** Stitches only close light and medium wounds (ch. 13, workspace spec 022, decision 4). */
const STITCHABLE_SEVERITIES: InjurySeverity[] = ['light', 'medium'];

/** Bleeding left by a cauterization when core serves no Table 13-1c (neutral fallback, no heat). */
const FALLBACK_CAUTERIZE_BLEEDING: Record<MedicalResult, CauterizationRow['bleeding']> = {
  'absolute-failure': 'unchanged',
  failure: 'unchanged',
  'partial-success': 'halved',
  success: 'stopped',
  'absolute-success': 'stopped',
};

/** Options of the completion of a procedure (workspace spec 068). */
export interface TreatmentApplyOptions {
  /** The unmodified roll: an unusual event on a cauterization. */
  unmodifiedRoll?: number;
  /** The Medicine total: the band of Table 13-1c of a cauterization. */
  total?: number;
  rules?: HealingCombatRules | null;
  castSupport?: CastSupport;
  /** The recovery modifier of a salve, set by the game master (decision 13). */
  salveModifier?: number | null;
}

const DIFFICULTY_LADDER: Difficulty[] = ['c', 's', 'r', 'e', 'l', 'm', 'h', 'vh', 'xh', 'sf', 'a', 'ni'];

/** The effect of a medical roll on an injury, read from the medical maneuver table of core. */
export interface MedicalOutcome {
  result: MedicalResult;
  /** Modifier to the recovery roll (Table 3-15). */
  recoveryModifier: number;
  /** Penalty points the injury gets worse by (positive), on an absolute failure. */
  injuryPenalty: number;
  message?: string;
}

export interface TreatmentEffect {
  /** Severity of the heat critical of a cauterization (Table 13-1c). */
  heatCritical?: string;
  /** Number of d10 of extra hits of a cauterization (Table 13-1c). */
  heatHitsDice?: number;
  /** Unmodified 66 on a cauterization: the patient catches fire (Table 13-1c), a warning for the game master. */
  unusualEvent?: boolean;
  healingType: HealingType;
  /** Modifier to the recovery roll the treatment leaves: the medical table's, none for a cauterization. */
  recoveryModifier: number;
}

export class InjuryTreatmentRules {
  /**
   * Default difficulty modifier of a procedure on an injury (workspace spec 022, decision 2 and D4): the row of core's
   * treatment difficulty table for the procedure, injury type and severity, harder on the head (ch. 13) and by the
   * bleeding when cauterizing, by core's treatment rules. Without a table (older core) or for magic, the procedure's
   * own difficulty, with the same rules.
   */
  static defaultDifficulty(procedure: TacticalProcedure, injury: Injury | undefined, tables?: TreatmentTables | null): number {
    let difficulty: Difficulty | number =
      procedure === 'magic' || !tables
        ? LEGACY_PROCEDURE_DIFFICULTY[procedure]
        : InjuryTreatmentRules.tableDifficulty(procedure, injury, tables.difficulties);
    if (injury?.location === 'head') {
      difficulty = InjuryTreatmentRules.harder(difficulty, tables?.rules.headDifficultySteps ?? HEAD_DIFFICULTY_STEPS);
    }
    let value = typeof difficulty === 'number' ? difficulty : (DIFFICULTY_MAP.get(difficulty) ?? 0);
    if (procedure === 'cauterize') {
      const perBleeding = tables?.rules.cauterizePenaltyPerBleeding ?? -CAUTERIZE_PENALTY_PER_BLEEDING;
      value += perBleeding * Math.max(0, injury?.bleeding ?? 0);
    }
    return value;
  }

  /**
   * The difficulty of the row of the procedure, type and severity of the injury. An injury of unknown type without
   * rows of its own takes the difficulty the rows of its severity agree on; if they differ, the game master has to set
   * the type.
   */
  private static tableDifficulty(
    procedure: TacticalProcedure,
    injury: Injury | undefined,
    rows: TreatmentDifficultyRow[],
  ): Difficulty | number {
    const type = injury?.type ?? 'unknown';
    const severity = injury?.severity;
    const ofSeverity = rows.filter(row => row.procedure === procedure && row.severity === severity);
    const exact = ofSeverity.find(row => row.injuryType === type);
    if (exact) {
      return InjuryTreatmentRules.toDifficulty(exact.difficulty);
    }
    if (type === 'unknown' && ofSeverity.length > 0) {
      const values = new Set(ofSeverity.map(row => InjuryTreatmentRules.valueOf(row.difficulty)));
      if (values.size > 1) {
        throw new ValidationError(`Set the type of the injury before treating it with ${procedure}`, 'err-injury-type-required');
      }
      return InjuryTreatmentRules.toDifficulty(ofSeverity[0].difficulty);
    }
    throw new ValidationError(`Procedure ${procedure} does not treat a ${severity ?? ''} ${type} injury`, 'err-treatment-not-applicable');
  }

  /** A difficulty of the table: a key of Table 5-1, or a modifier (the key with that value when there is one). */
  private static toDifficulty(value: string | number): Difficulty | number {
    if (typeof value === 'number') {
      return DIFFICULTY_LADDER.find(key => DIFFICULTY_MAP.get(key) === value) ?? value;
    }
    const key = DIFFICULTY_LADDER.find(each => each === value);
    if (!key) {
      throw new ValidationError(`Unknown treatment difficulty ${value}`, 'err-treatment-invalid-difficulty');
    }
    return key;
  }

  private static valueOf(value: string | number): number {
    const difficulty = InjuryTreatmentRules.toDifficulty(value);
    return typeof difficulty === 'number' ? difficulty : (DIFFICULTY_MAP.get(difficulty) ?? 0);
  }

  /** `steps` harder on Table 5-1 (ch. 13, head injuries); a modifier off the ladder is 10 harder per step. */
  private static harder(difficulty: Difficulty | number, steps: number): Difficulty | number {
    if (typeof difficulty === 'number') {
      return difficulty - 10 * steps;
    }
    return DIFFICULTY_LADDER[Math.min(Math.max(DIFFICULTY_LADDER.indexOf(difficulty) + steps, 0), DIFFICULTY_LADDER.length - 1)];
  }

  /** The treatment works: a success or an absolute success, as in strategic (workspace spec 022, D5). */
  static isSuccess(result: MedicalResult): boolean {
    return result === 'success' || result === 'absolute-success';
  }

  /** A salve's recovery modifier goes in core's range (decision 13). */
  static validateSalve(procedure: string, salveModifier: number | null | undefined, rules?: HealingCombatRules | null): void {
    if (procedure !== 'salve' || salveModifier === undefined || salveModifier === null) return;
    const range = rules?.salveModifier ?? { min: -25, max: 25 };
    if (salveModifier < range.min || salveModifier > range.max) {
      throw new ValidationError(`The salve modifier goes from ${range.min} to ${range.max}`, 'err-treatment-invalid-salve');
    }
  }

  /** The injury only admits surgery or magic (workspace spec 068, decision 11). */
  static requiresSurgery(injury: Injury, rules?: HealingCombatRules | null): boolean {
    return (rules?.surgeryRequired ?? []).some(row => row.injuryType === injury.type && row.severity === injury.severity);
  }

  static validate(procedure: TacticalProcedure, injury: Injury, rules?: HealingCombatRules | null): void {
    if ((procedure as string) === 'surgery') {
      throw new ValidationError('Surgery is not offered in a tactical game', 'err-treatment-not-in-combat');
    }
    if (!SURGERY_ALTERNATIVES.includes(procedure) && InjuryTreatmentRules.requiresSurgery(injury, rules)) {
      throw new ValidationError(`A ${injury.severity} ${injury.type} injury only admits surgery`, 'err-treatment-surgery-required');
    }
    if (!TACTICAL_PROCEDURES.includes(procedure)) {
      throw new ValidationError(`Procedure ${procedure as string} is not available in a tactical game`, 'err-treatment-invalid-procedure');
    }
    if (procedure === 'tourniquet' && injury.location && injury.location !== 'arm' && injury.location !== 'leg') {
      throw new ValidationError('A tourniquet only goes on a limb', 'err-treatment-invalid-location');
    }
    if ((procedure === 'splint' || procedure === 'cast') && injury.location && injury.location !== 'arm' && injury.location !== 'leg') {
      throw new ValidationError(`A ${procedure} only goes on a limb`, 'err-treatment-not-applicable');
    }
    if (procedure === 'stitches' && !STITCHABLE_SEVERITIES.includes(injury.severity)) {
      throw new ValidationError('Stitches only close light and medium wounds', 'err-treatment-invalid-severity');
    }
    if (injury.status === 'healed') {
      throw new ValidationError(`Injury ${injury.id} is healed`, 'err-injury-healed');
    }
  }

  /**
   * Applies the outcome of a procedure to the injury (spec 013, §3, corrected by workspace spec 022). Only a success
   * works: pressure stops a light bleeding and slows the rest by 4; stitches stop it and halve the penalty (toward
   * zero); a tourniquet stops it; magic always stops it. An absolute failure makes the injury worse by the penalty of
   * the medical table (10 when it gives none), its initial penalty too, and its severity follows. A cauterization has
   * its own table (13-1c): it stops, halves or leaves the bleeding, gives a heat critical and extra hits, and no
   * recovery modifier.
   */
  static apply(
    procedure: TacticalProcedure,
    injury: Injury,
    outcome: MedicalOutcome,
    options: TreatmentApplyOptions = {},
  ): TreatmentEffect {
    const bleeding = Math.max(0, injury.bleeding ?? 0);
    const success = InjuryTreatmentRules.isSuccess(outcome.result);
    const healingType = InjuryTreatmentRules.healingType(procedure, outcome);
    if (procedure === 'cauterize') {
      return InjuryTreatmentRules.cauterize(injury, outcome, options, healingType);
    }
    if (outcome.result === 'absolute-failure') {
      InjuryTreatmentRules.worsen(injury, outcome.injuryPenalty > 0 ? outcome.injuryPenalty : DEFAULT_WORSENING);
    }
    if (procedure === 'magic') {
      InjuryTreatmentRules.setBleeding(injury, 0, 'magic');
    } else if (success) {
      switch (procedure) {
        case 'pressure':
          InjuryTreatmentRules.setBleeding(injury, bleeding <= PRESSURE_STOPS_UP_TO ? 0 : bleeding - PRESSURE_REDUCTION, 'pressure');
          break;
        case 'stitches':
          InjuryTreatmentRules.setBleeding(injury, 0, 'stitches');
          InjuryTreatmentRules.halvePenalty(injury);
          break;
        case 'tourniquet':
          InjuryTreatmentRules.setBleeding(injury, 0, procedure);
          break;
        case 'splint':
        case 'cast': {
          const limits = InjuryTreatmentRules.limitsOf(procedure, injury, options);
          if (limits) injury.limits = limits;
          break;
        }
        case 'dress':
        case 'salve':
          break;
      }
    }
    const salve = procedure === 'salve' && typeof options.salveModifier === 'number';
    return { healingType, recoveryModifier: salve ? options.salveModifier! : outcome.recoveryModifier };
  }

  /**
   * Table 13-1c from core (workspace spec 068, decision 12): the band of the Medicine total gives the bleeding left,
   * the heat critical and the d10 of extra hits; no recovery modifier. Without the table, a neutral fallback by the
   * medical result (no heat).
   */
  private static cauterize(
    injury: Injury,
    outcome: MedicalOutcome,
    options: TreatmentApplyOptions,
    healingType: HealingType,
  ): TreatmentEffect {
    const bleeding = Math.max(0, injury.bleeding ?? 0);
    const rows = options.rules?.cauterization ?? [];
    const band =
      rows.length > 0 && typeof options.total === 'number'
        ? rows.find(row => (row.min === null || options.total! >= row.min) && (row.max === null || options.total! <= row.max))
        : undefined;
    const change = band ? band.bleeding : FALLBACK_CAUTERIZE_BLEEDING[outcome.result];
    if (change === 'halved') {
      InjuryTreatmentRules.setBleeding(injury, Math.floor(bleeding / 2), 'cauterized');
    } else if (change === 'stopped') {
      InjuryTreatmentRules.setBleeding(injury, 0, 'cauterized');
    }
    const effect: TreatmentEffect = { healingType, recoveryModifier: 0 };
    if (band?.heatSeverity) {
      effect.heatCritical = band.heatSeverity;
      effect.heatHitsDice = band.hitsDice;
    }
    const unusual = options.rules?.cauterizationUnusualRoll ?? UNUSUAL_EVENT_ROLL;
    if (options.unmodifiedRoll === unusual) {
      effect.unusualEvent = true;
    }
    return effect;
  }

  /** Limits a splint or a cast leaves on a limb (decision 10), from core's treatment limits; none without them. */
  static limitsOf(procedure: 'splint' | 'cast', injury: Injury, options: TreatmentApplyOptions): InjuryLimits | null {
    const rules = options.rules?.treatmentLimits;
    if (!rules) return null;
    const pace = (value: string | undefined): Pace | null => PACES.find(each => each === value) ?? null;
    if (procedure === 'splint') {
      if (injury.location === 'leg') return { pace: pace(rules.splint.leg.pace) };
      if (injury.location === 'arm' && rules.splint.arm.limbUnusable) return { limbUnusable: true };
      return null;
    }
    const factor = rules.cast.maneuverPenaltyFactor;
    if (injury.location === 'leg') {
      const support = options.castSupport ?? 'none';
      const leg = rules.cast.leg;
      return {
        pace: pace(support === 'cane' ? leg.cane : support === 'crutches' ? leg.crutches : leg.pace),
        maneuverPenaltyFactor: factor,
      };
    }
    return { maneuverPenaltyFactor: factor };
  }

  static healingType(procedure: TacticalProcedure, outcome: MedicalOutcome): HealingType {
    if (procedure === 'magic') {
      return 'magic-or-herbs';
    }
    if (outcome.result === 'absolute-success') {
      return 'medicine-absolute';
    }
    return InjuryTreatmentRules.isSuccess(outcome.result) ? 'medicine' : 'none';
  }

  /**
   * D1: the penalty and the initial penalty (which strategic recovers from) get worse, and the severity follows them.
   */
  private static worsen(injury: Injury, worsening: number): void {
    injury.penalty = Math.min(0, injury.penalty) - worsening;
    injury.initialPenalty = Math.min(0, injury.initialPenalty ?? 0) - worsening;
    injury.severity = deriveInjurySeverity(Math.min(injury.penalty, injury.initialPenalty), injury.bleeding);
  }

  /** D2: a stitched wound keeps half its penalty, rounded toward zero; the initial one too, so recovery starts there. */
  private static halvePenalty(injury: Injury): void {
    injury.penalty = InjuryTreatmentRules.half(injury.penalty);
    injury.initialPenalty = InjuryTreatmentRules.half(injury.initialPenalty ?? injury.penalty);
  }

  private static half(penalty: number): number {
    return Math.trunc(Math.min(0, penalty) / 2) || 0;
  }

  /**
   * Rounds a stabilized dying actor gains (spec 013, §3): core's stabilize rules (workspace spec 068, decision 6), 1 on a
   * success and 2 on an absolute success by default.
   */
  static stabilizationRounds(result: MedicalResult, rules?: HealingCombatRules['stabilize'] | null): number {
    if (result === 'absolute-success') {
      return rules?.absoluteRounds ?? 2;
    }
    return result === 'success' ? (rules?.successRounds ?? 1) : 0;
  }

  /**
   * Rounds a procedure takes in combat (decision 2): core's duration, per point of bleeding when it says so, at least 1.
   * No row: 1 round. A null duration (surgery) is not offered in tactical.
   */
  static durationRounds(procedure: string, injury: Injury | undefined, rules?: HealingCombatRules | null): number {
    const row = (rules?.treatmentDurations ?? []).find(each => each.procedure === procedure);
    if (!row) return 1;
    if (row.rounds === null || row.rounds === undefined) {
      throw new ValidationError(`Procedure ${procedure} is not offered in a tactical game`, 'err-treatment-not-in-combat');
    }
    const rounds = row.perBleeding ? row.rounds * Math.max(1, injury?.bleeding ?? 0) : row.rounds;
    return Math.max(1, rounds);
  }

  private static setBleeding(injury: Injury, bleeding: number, control: Injury['bleedingControl']): void {
    const before = Math.max(0, injury.bleeding ?? 0);
    if (before === 0) {
      return;
    }
    injury.bleeding = Math.max(0, bleeding);
    injury.bleedingControl = control;
  }
}
