import type { CastSupport, MedicalResult, TreatmentProcedure } from '../../../actor-rounds/domain/value-objects/injury.vo.js';
import type { Difficulty } from './difficulty.vo.js';
import type { KeyValueModifier } from './key-value-modifier.vo.js';

/** Action points a `medical` action takes in each round it lasts (workspace spec 068, decision 2). */
export const MEDICAL_AP_PER_ROUND = 4;

/** Procedures of a `medical` action: the tactical ones and stabilizing a dying actor (surgery is refused). */
export const MEDICAL_ACTION_PROCEDURES: TreatmentProcedure[] = [
  'pressure',
  'stitches',
  'tourniquet',
  'cauterize',
  'dress',
  'splint',
  'cast',
  'salve',
  'magic',
  'stabilize',
];

/** Bonus of a successful Herbalism roll to the Medicine roll of the action (decision 7). */
export const HERBALISM_BONUS = 25;

/** Rule references of the medical action (Core Law). */
export const MEDICAL_ACTION_RULES = {
  duration: '§13.1 Table 13-1',
  herbalism: '§13.1',
  stabilize: '§13.2',
  interruption: '§8.1',
} as const;

/** How far a medical action went: declared, rolled and in progress, completed or aborted. */
export type MedicalActionState = 'pending' | 'in-progress' | 'completed' | 'aborted';

/** The Herbalism roll that helps the treatment (decision 7). */
export interface MedicalHerbalism {
  /** Unmodified roll; null: the server rolls it. */
  roll: number | null;
  /** Herb of the healer's inventory: one unit is recorded as consumed. */
  itemId?: string | null;
  /** Filled when it is resolved. */
  total?: number;
  success?: boolean;
  bonus?: number;
}

/** One round of a medical action resolved: the roll of its first round, or the roll of each stabilize round. */
export interface MedicalStepResult {
  /** Round of the game it was resolved in. */
  round: number;
  /** 1 for the first round of the action. */
  step: number;
  roll?: number;
  total?: number;
  result?: MedicalResult;
  breakdown?: KeyValueModifier[];
  /** Stabilize: rounds the dying effect gained, and whether the success removed it (its cause was treated). */
  roundsGained?: number;
  removed?: boolean;
  /** The treatment was applied in this round. */
  completed?: boolean;
  /** Cauterize: severity of the heat critical and hits taken. */
  heatCritical?: string | null;
  heatHits?: number | null;
}

/**
 * The data of a `medical` action (workspace spec 068, §2): a procedure of the healer (the actor of the action) on an
 * injury or a dying effect of the patient, which can be the healer itself. It takes 4 AP per round for `rounds` rounds;
 * each continuation carries this data.
 */
export interface ActionMedical {
  patientActorId: string;
  injuryId: string | null;
  /** The dying effect of a `stabilize` procedure. */
  effectId: string | null;
  procedure: TreatmentProcedure;
  /** Rounds the procedure takes: the game master's or core's duration (min 1). */
  rounds: number;
  /** Rounds come from the game master. */
  roundsOverride?: boolean;
  /** Medicine roll of the first round; null: the server rolls. */
  roll: number | null;
  unmodifiedRoll?: number | null;
  difficulty?: Difficulty | null;
  herbalism?: MedicalHerbalism | null;
  castSupport?: CastSupport | null;
  salveModifier?: number | null;
  heatHitsRoll?: number | null;
  heatCriticalRoll?: number | null;
  /** First action of the procedure: its id stays across continuations and identifies the treatment in progress. */
  originActionId: string;
  /** Round of the first roll. */
  startedRound: number | null;
  /** Rounds of 4 AP already resolved. */
  resolvedSteps: number;
  state: MedicalActionState;
  results: MedicalStepResult[];
}

/** The result of a `use_item` action resolved (decision 7). */
export interface ActionUseItemResult {
  itemName: string;
  /** Hits of the dose (the roll sent or rolled). */
  roll?: number;
  healed: number;
  stunRoundsRemoved: number;
}

/** The data of a `use_item` action (workspace spec 068, §2): a healing item of the actor used on a target. */
export interface ActionUseItem {
  itemId: string;
  targetActorId: string;
  roll?: number | null;
  result?: ActionUseItemResult | null;
}

/** A warning of a declaration (workspace spec 068): the ones with `requiresConfirm` need `confirm: true`. */
export interface ActionWarning {
  code: ActionWarningCode;
  params?: Record<string, string | number | boolean>;
  requiresConfirm: boolean;
}

export type ActionWarningCode =
  | 'movement-round-limit'
  | 'movement-phase-over-dash'
  | 'movement-prone-with-action'
  | 'treatment-interrupted'
  | 'exertion-reopens-wound'
  | 'limb-unusable'
  | 'limb-lost'
  | 'fear-balk-pace'
  | 'fear-balk-charge'
  | 'fear-retreat-pace';
