import { DIFFICULTY_MAP, Difficulty } from '../../../actions/domain/value-objects/dificulty.vo';
import { ValidationError } from '../../../shared/domain/errors';
import { HealingType, Injury, MedicalResult } from '../value-objets/injury.vo';

/** Procedures that can be done during a tactical game (spec 013, §3). */
export type TacticalProcedure = 'pressure' | 'stitches' | 'tourniquet' | 'cauterize' | 'dress' | 'magic';
export const TACTICAL_PROCEDURES: TacticalProcedure[] = ['pressure', 'stitches', 'tourniquet', 'cauterize', 'dress', 'magic'];

export const MEDICAL_RESULTS: MedicalResult[] = ['absolute-failure', 'failure', 'partial-success', 'success', 'absolute-success'];

/** Difficulty of each procedure (ch. 13): direct pressure easy, stitches medium, tourniquet very hard, dressing routine. */
const PROCEDURE_DIFFICULTY: Record<TacticalProcedure, Difficulty> = {
  pressure: 'e',
  stitches: 'm',
  tourniquet: 'vh',
  cauterize: 'r',
  dress: 'r',
  magic: 'm',
};

/** Cauterizing is harder by 5 per point of bleeding (ch. 13). */
const CAUTERIZE_PENALTY_PER_BLEEDING = 5;

/** Direct pressure stops a light bleeding and slows a more serious one by this much (ch. 13). */
const PRESSURE_STOPS_UP_TO = 3;
const PRESSURE_REDUCTION = 4;

/** Penalty added on an absolute failure when core gives none. */
const DEFAULT_WORSENING = 10;

/** Severity of the heat critical a cauterization inflicts, by result (Table 13-1c). */
const CAUTERIZE_HEAT_CRITICAL: Record<MedicalResult, string | undefined> = {
  'absolute-failure': 'D',
  failure: 'C',
  'partial-success': 'B',
  success: 'A',
  'absolute-success': undefined,
};

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
  /** Severity of the heat critical the game master has to resolve (cauterize). */
  heatCritical?: string;
  healingType: HealingType;
}

export class InjuryTreatmentRules {
  /**
   * Default difficulty modifier of a procedure on an injury: one step harder on the head (ch. 13), and harder by the
   * bleeding when cauterizing.
   */
  static defaultDifficulty(procedure: TacticalProcedure, injury: Injury | undefined): number {
    let difficulty = PROCEDURE_DIFFICULTY[procedure];
    if (injury?.location === 'head') {
      difficulty = DIFFICULTY_LADDER[Math.min(DIFFICULTY_LADDER.indexOf(difficulty) + 1, DIFFICULTY_LADDER.length - 1)];
    }
    let value = DIFFICULTY_MAP.get(difficulty) ?? 0;
    if (procedure === 'cauterize') {
      value -= CAUTERIZE_PENALTY_PER_BLEEDING * Math.max(0, injury?.bleeding ?? 0);
    }
    return value;
  }

  /** The treatment works: partial success or better. */
  static isSuccess(result: MedicalResult): boolean {
    return result === 'partial-success' || result === 'success' || result === 'absolute-success';
  }

  static validate(procedure: TacticalProcedure, injury: Injury): void {
    if (!TACTICAL_PROCEDURES.includes(procedure)) {
      throw new ValidationError(`Procedure ${procedure as string} is not available in a tactical game`, 'err-treatment-invalid-procedure');
    }
    if (procedure === 'tourniquet' && injury.location && injury.location !== 'arm' && injury.location !== 'leg') {
      throw new ValidationError('A tourniquet only goes on a limb', 'err-treatment-invalid-location');
    }
    if (injury.status === 'healed') {
      throw new ValidationError(`Injury ${injury.id} is healed`, 'err-injury-healed');
    }
  }

  /**
   * Applies the outcome of a procedure to the injury (spec 013, §3): pressure stops a light bleeding and slows the rest
   * by 4; stitches, tourniquet and magic stop it; cauterizing stops it (or halves it on a failure) and leaves a heat
   * critical for the game master. An absolute failure makes the penalty worse by 10 (cauterize has its own table: no
   * effect on the bleeding, the worst heat critical).
   */
  static apply(procedure: TacticalProcedure, injury: Injury, outcome: MedicalOutcome): TreatmentEffect {
    const bleeding = Math.max(0, injury.bleeding ?? 0);
    const success = InjuryTreatmentRules.isSuccess(outcome.result);
    if (procedure === 'cauterize') {
      if (outcome.result === 'failure') {
        InjuryTreatmentRules.setBleeding(injury, Math.floor(bleeding / 2), 'cauterized');
      } else if (success) {
        InjuryTreatmentRules.setBleeding(injury, 0, 'cauterized');
      }
      return { heatCritical: CAUTERIZE_HEAT_CRITICAL[outcome.result], healingType: InjuryTreatmentRules.healingType(procedure, outcome) };
    }
    if (outcome.result === 'absolute-failure') {
      const worsening = outcome.injuryPenalty > 0 ? outcome.injuryPenalty : DEFAULT_WORSENING;
      injury.penalty = Math.min(0, injury.penalty) - worsening;
    }
    if (procedure === 'magic') {
      InjuryTreatmentRules.setBleeding(injury, 0, 'magic');
    } else if (success) {
      switch (procedure) {
        case 'pressure':
          InjuryTreatmentRules.setBleeding(injury, bleeding <= PRESSURE_STOPS_UP_TO ? 0 : bleeding - PRESSURE_REDUCTION, 'pressure');
          break;
        case 'stitches':
        case 'tourniquet':
          InjuryTreatmentRules.setBleeding(injury, 0, procedure);
          break;
        case 'dress':
          break;
      }
    }
    return { healingType: InjuryTreatmentRules.healingType(procedure, outcome) };
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

  /** Rounds a stabilized dying actor gains: 1 on a success, 2 on an absolute success (spec 013, §3). */
  static stabilizationRounds(result: MedicalResult): number {
    if (result === 'absolute-success') {
      return 2;
    }
    return result === 'success' ? 1 : 0;
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
