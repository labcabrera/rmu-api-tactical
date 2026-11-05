import type { SeverityAdjustmentStep } from '../../../shared/domain/severity.js';
import type { TemperatureKind } from '../services/environment-rules.js';

/**
 * A fall (§15.4) or an object falling on the actor (§15.5), workspace spec 077, decision D2; or an extreme temperature
 * (§15.3, workspace spec 079, C3): a critical of cold, heat or steam without an attack roll.
 */
export type HazardKind = 'fall' | 'falling-object' | 'extreme-temperature';

export const HAZARD_KINDS: HazardKind[] = ['fall', 'falling-object', 'extreme-temperature'];

/** The extreme temperature of a hazard (workspace spec 079, C3): its kind, °C and where its severity comes from. */
export interface HazardTemperature {
  kind: TemperatureKind;
  /** °C given; null when the game master gave the severity. */
  celsius: number | null;
  criticalType: string;
  severitySource: 'table' | 'given';
}

/** Attack tables of the hazards: Crush for a fall and for an object as large as the target or larger, Rock otherwise. */
export type HazardAttackTable = 'crush' | 'rock';

/** One critical of a hazard: rolled with the hazard, or left as a `critical` alert with origin `hazard`. */
export interface HazardCritical {
  criticalType: string;
  criticalSeverity: string;
  roll: number | null;
  damage: number | null;
  text: string | null;
  location: string | null;
  /** The alert the game master resolves it with, when it was not rolled with the hazard. */
  alertId: string | null;
}

/** A resolved hazard attack, kept in the actor round it hit (workspace spec 077, decision D2). */
export interface ActorRoundHazard {
  id: string;
  kind: HazardKind;
  round: number;
  /** 0 before the action phases, 1-4 in them. */
  phase: number | null;
  distanceFeet: number;
  /** Fall: the actor jumped on purpose, its height comes off the distance. */
  deliberate: boolean;
  /** Fall: the height of the actor in feet used for a deliberate jump. */
  heightFeet: number | null;
  /** Fall: the `fall-control` maneuver it cites and its steps (absolute failure +1, success -1, absolute success -2). */
  fallControlActionId: string | null;
  fallControlSteps: number;
  /** Falling object: its size (Table 9-4a), given or from its weight. */
  objectSize: string | null;
  weightLbs: number | null;
  /** Falling object: the shield of the actor counted (Rock only). */
  shield: boolean;
  /** Null for an extreme temperature: no attack table. */
  attackTable: HazardAttackTable | null;
  /** Steps from medium of the attack: the actor's size for a fall, the object's for a falling object. */
  attackSize: number;
  ob: number;
  db: number;
  /** Open-ended roll (upwards, no fumble) and total (roll + OB - DB). */
  roll: number;
  total: number;
  armor: number;
  /** The text of the attack table and its damage, already scaled by the Hit Multiplier of the attack size. */
  text: string;
  baseDamage: number;
  multiplier: number;
  damage: number;
  /** Severity of the table and after the size and fall control steps (null: no critical). */
  originalSeverity: string | null;
  severity: string | null;
  severitySteps: SeverityAdjustmentStep[];
  /**
   * Workspace spec 079, decision A4: the hazard of a knock-back gives no critical worse than the one that knocked the
   * actor back (§9.8 Knocked Back). Missing or null: no cap.
   */
  severityCap?: string | null;
  /** The `knocked-back` alert the hazard resolves (spec 079). */
  knockedBackAlertId?: string | null;
  criticals: HazardCritical[];
  /** Workspace spec 079, C3: the extreme temperature of the hazard. Missing or null for the others. */
  temperature?: HazardTemperature | null;
  note: string | null;
  createdAt: string;
}
