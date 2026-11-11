import type { InjuryPoison } from './poison.vo.js';

/**
 * Injuries (spec 013, §1): the model shared with the strategic API. An injury has a stable uuid: it comes from the
 * character into round 1 and goes back to it when the finished game is applied.
 */
export type InjuryType = 'bone' | 'cut-burn' | 'muscle-tendon' | 'organ' | 'poison-disease' | 'skin-tissue' | 'unknown';
export type InjurySeverity = 'light' | 'medium' | 'severe';
export type BodyLocation = 'head' | 'chest' | 'abdomen' | 'arm' | 'leg';
export type BodySide = 'left' | 'right';
export type BleedingControl = 'pressure' | 'stitches' | 'tourniquet' | 'cauterized' | 'magic';
export type InjuryFlag = 'permanent-risk' | 'limb-loss' | 'blinding' | 'paralysis';
export type InjuryStatus = 'active' | 'recovering' | 'permanent' | 'healed';
/**
 * `poison`: the effects a poisoning puts on the actor (workspace spec 042). `hazard`: a fall or a falling object
 * (workspace spec 077, decision D1).
 */
export type InjurySourceKind = 'critical' | 'fumble' | 'fatigue' | 'manual' | 'poison' | 'hazard';

export const INJURY_TYPES: InjuryType[] = ['bone', 'cut-burn', 'muscle-tendon', 'organ', 'poison-disease', 'skin-tissue', 'unknown'];
export const INJURY_SEVERITIES: InjurySeverity[] = ['light', 'medium', 'severe'];
export const BODY_LOCATIONS: BodyLocation[] = ['head', 'chest', 'abdomen', 'arm', 'leg'];
export const BLEEDING_CONTROLS: BleedingControl[] = ['pressure', 'stitches', 'tourniquet', 'cauterized', 'magic'];
export const INJURY_FLAGS: InjuryFlag[] = ['permanent-risk', 'limb-loss', 'blinding', 'paralysis'];
export const INJURY_STATUSES: InjuryStatus[] = ['active', 'recovering', 'permanent', 'healed'];

/** Statuses whose penalty counts (spec 013, §3). */
export const PENALIZING_INJURY_STATUSES: InjuryStatus[] = ['active', 'recovering', 'permanent'];

export interface InjurySource {
  kind: InjurySourceKind;
  tacticalGameId?: string;
  tacticalGameName?: string;
  actionId?: string;
  round?: number;
  attackerId?: string;
  attackerName?: string;
  /** `${table}-${severity}-${roll}`, such as `S-C-91`. */
  criticalKey?: string;
  /** The poisoning an effect of kind `poison` comes from (workspace spec 042). */
  injuryId?: string;
}

export type TreatmentProcedure =
  | 'pressure'
  | 'stitches'
  | 'tourniquet'
  | 'cauterize'
  | 'dress'
  | 'splint'
  | 'cast'
  | 'salve'
  | 'surgery'
  | 'magic'
  | 'herbs'
  | 'stabilize';

/** Movement paces (Table 5-3), slowest first. */
export type Pace = 'creep' | 'walk' | 'jog' | 'run' | 'sprint' | 'dash';
export const PACES: Pace[] = ['creep', 'walk', 'jog', 'run', 'sprint', 'dash'];

/** Support of a cast leg (workspace spec 068, decision 10): the pace limit depends on it. */
export type CastSupport = 'none' | 'cane' | 'crutches';
export const CAST_SUPPORTS: CastSupport[] = ['none', 'cane', 'crutches'];

/**
 * What a splint or a cast leaves on the injury (workspace spec 068, decision 10): the pace limit of a leg, a useless arm
 * and the factor of the maneuver penalty (a cast halves it). Copied from the character into round 1.
 */
export interface InjuryLimits {
  pace?: Pace | null;
  limbUnusable?: boolean;
  maneuverPenaltyFactor?: number | null;
}

/** When a treated wound opens again (decision 5): pressure with exertion, stitches with a failed roll. */
export type InjuryReopenOn = 'exertion' | 'failed-roll';

/** A tourniquet on the injury (decision 5), by round numbers of the game. */
export interface InjuryTourniquet {
  tightSince: number;
  loosenedAt: number | null;
  /** Bleeding it stopped: the wound bleeds it the round it is loosened. */
  bleeding?: number;
}

/**
 * A treatment declared as a `medical` action and not finished yet (workspace spec 068, §2): the Medicine roll is made
 * when the action is first resolved, and the effect is applied when its rounds are done.
 */
export interface TreatmentInProgress {
  /** The first action of the treatment (its continuations keep it). */
  actionId: string;
  healerActorId: string;
  procedure: TreatmentProcedure;
  startedRound: number;
  rounds: number;
  roll: number;
  total: number;
  result: MedicalResult;
  /** What the completion needs of the medical table and the roll. */
  recoveryModifier?: number;
  injuryPenalty?: number;
  difficulty?: number;
  healer?: InjuryHealer;
  unmodifiedRoll?: number;
  castSupport?: CastSupport;
  salveModifier?: number | null;
  /** Bleeding before the procedure: pressure keeps it stopped while it is held. */
  bleeding?: number;
}

export type MedicalResult = 'absolute-failure' | 'failure' | 'partial-success' | 'success' | 'absolute-success';

export type HealingType = 'none' | 'medicine' | 'medicine-absolute' | 'magic-or-herbs' | 'magic-and-herbs';

export interface InjuryHealer {
  characterId?: string;
  actorId?: string;
  name: string;
  external?: boolean;
  bonus: number;
}

export interface InjuryTreatment {
  id: string;
  procedure: TreatmentProcedure;
  healer: InjuryHealer;
  /** Difficulty modifier applied. */
  difficulty: number;
  roll: number;
  total: number;
  result: MedicalResult;
  healingType: HealingType;
  /** From the medical maneuver table of core. */
  recoveryModifier: number;
  at: string;
  context: 'tactical' | 'strategic';
  tacticalGameId?: string;
  /** `completed-after-combat`: a treatment in progress when the game finished (workspace spec 068, decision 4). */
  note?: string;
  castSupport?: CastSupport;
  salveModifier?: number;
}

export interface InjuryRecovery {
  roll: number;
  modifiers: number;
  total: number;
  baseDays: number;
  multiplier: number;
  totalDays: number;
  remainingDays: number;
  startedAt: string;
}

export interface Injury {
  id: string;
  type: InjuryType;
  severity: InjurySeverity;
  location?: BodyLocation;
  side?: BodySide;
  /** Current penalty, 0 or negative. */
  penalty: number;
  initialPenalty: number;
  /** Hits per round; 0 or missing when stopped. */
  bleeding?: number;
  bleedingControl?: BleedingControl;
  flags?: InjuryFlag[];
  description?: string;
  source: InjurySource;
  treatments: InjuryTreatment[];
  recovery?: InjuryRecovery;
  permanent?: { penalty: number; roll?: number };
  /** A poisoning (workspace spec 042): only in `poison-disease` injuries. */
  poison?: InjuryPoison;
  status: InjuryStatus;
  createdAt: string;
  updatedAt?: string;
  healedAt?: string;
  /** Workspace spec 068: limits of a splint or a cast. */
  limits?: InjuryLimits | null;
  reopenOn?: InjuryReopenOn | null;
  /** Bleeding the wound takes again when it reopens (tactical only). */
  reopenBleeding?: number | null;
  tourniquet?: InjuryTourniquet | null;
  treatmentInProgress?: TreatmentInProgress | null;
}

export interface CharacterCondition {
  id: string;
  status: 'unconscious' | 'permanent-unconscious' | 'dead';
  source: InjurySource;
  description?: string;
  createdAt: string;
  resolvedAt?: string;
}

/**
 * Severity (spec 013, §1): a penalty of -1 to -20 or bleeding of 1-3 is light, -21 to -40 or 4-6 medium, worse is
 * severe; the worst of both.
 */
export const deriveInjurySeverity = (penalty: number | undefined, bleeding: number | undefined): InjurySeverity => {
  const byPenalty = severityRank(Math.abs(Math.min(0, penalty ?? 0)), 20, 40);
  const byBleeding = severityRank(Math.max(0, bleeding ?? 0), 3, 6);
  return INJURY_SEVERITIES[Math.max(byPenalty, byBleeding)];
};

const severityRank = (value: number, lightMax: number, mediumMax: number): number => {
  if (value > mediumMax) {
    return 2;
  }
  return value > lightMax ? 1 : 0;
};

/** The injury still penalizes. */
export const isPenalizing = (injury: Injury): boolean => PENALIZING_INJURY_STATUSES.includes(injury.status);

/** Pressure held on the injury by a healer stops its bleeding while the treatment goes on (workspace spec 068). */
export const isPressureHeld = (injury: Injury): boolean =>
  injury.treatmentInProgress?.procedure === 'pressure' &&
  (injury.treatmentInProgress.result === 'success' || injury.treatmentInProgress.result === 'absolute-success');

/** The injury bleeds now. */
export const isBleeding = (injury: Injury): boolean => injury.status !== 'healed' && (injury.bleeding ?? 0) > 0 && !isPressureHeld(injury);

export interface NewInjury {
  id: string;
  type: InjuryType;
  location?: BodyLocation;
  side?: BodySide;
  penalty: number;
  bleeding?: number;
  flags?: InjuryFlag[];
  description?: string;
  source: InjurySource;
  severity?: InjurySeverity;
  createdAt?: Date;
}

/** A new active injury with its severity derived, untreated. */
export const buildInjury = (data: NewInjury): Injury => {
  const penalty = Math.min(0, data.penalty || 0);
  const bleeding = Math.max(0, data.bleeding || 0);
  const injury: Injury = {
    id: data.id,
    type: data.type,
    severity: data.severity ?? deriveInjurySeverity(penalty, bleeding),
    penalty,
    initialPenalty: penalty,
    source: data.source,
    treatments: [],
    status: 'active',
    createdAt: (data.createdAt ?? new Date()).toISOString(),
  };
  if (data.location) injury.location = data.location;
  if (data.side) injury.side = data.side;
  if (bleeding > 0) injury.bleeding = bleeding;
  if (data.flags && data.flags.length > 0) injury.flags = [...data.flags];
  if (data.description) injury.description = data.description;
  return injury;
};

/** Location of an attack or a critical result (limbs in plural or singular) as a body location. */
export const toBodyLocation = (location: string | null | undefined): BodyLocation | undefined => {
  if (!location) {
    return undefined;
  }
  const value = location === 'arms' ? 'arm' : location === 'legs' ? 'leg' : location;
  return BODY_LOCATIONS.find(candidate => candidate === value);
};

/** Side of a hit from the unmodified attack roll: odd left, even right (spec 013, §1). */
export const sideOfRoll = (roll: number | null | undefined): BodySide | undefined => {
  if (roll === undefined || roll === null || !Number.isFinite(roll)) {
    return undefined;
  }
  return Math.abs(Math.trunc(roll)) % 2 === 1 ? 'left' : 'right';
};
