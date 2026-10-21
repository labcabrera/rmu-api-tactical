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
export type InjurySourceKind = 'critical' | 'fumble' | 'fatigue' | 'manual';

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
  | 'herbs';

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
  status: InjuryStatus;
  createdAt: string;
  updatedAt?: string;
  healedAt?: string;
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

/** The injury bleeds now. */
export const isBleeding = (injury: Injury): boolean => injury.status !== 'healed' && (injury.bleeding ?? 0) > 0;

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
