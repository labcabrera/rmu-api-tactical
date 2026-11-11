import { FRENZY_PURPOSES, type FrenzyPurpose } from './frenzy-purpose.vo.js';

/**
 * Maneuvers of the combat talents (workspace spec 076, decisions B7-B9, §2.6): Battle Cry (Influence, intimidation),
 * Sense Weakness and Study Offense (Perception against a foe) and Precision (Ambush against a foe).
 */
export type CombatTalentPurpose = 'battle-cry' | 'sense-weakness' | 'study-offense' | 'precision';

export const COMBAT_TALENT_PURPOSES: CombatTalentPurpose[] = ['battle-cry', 'sense-weakness', 'study-offense', 'precision'];

/** Escape from the grapples of the actor (workspace spec 077, decision A3.3). */
export type GrapplePurpose = 'grapple-escape';

export const GRAPPLE_ESCAPE: GrapplePurpose = 'grapple-escape';

/** Acrobatics to control a fall (§15.4; workspace spec 077, decision D4): instantaneous, 0 AP. */
export type FallControlPurpose = 'fall-control';

export const FALL_CONTROL: FallControlPurpose = 'fall-control';

/**
 * Workspace spec 079, block B: a feat of strength with Weight Training (§5.2), an adrenal move (§3.4, Table 3-4) and
 * Fortitude (§3.5, instantaneous, 0 AP, Table 3-4).
 */
export type FeatOfStrengthPurpose = 'feat-of-strength';
export type AdrenalPurpose = 'adrenal';
export type FortitudePurpose = 'fortitude';

export const FEAT_OF_STRENGTH: FeatOfStrengthPurpose = 'feat-of-strength';
export const ADRENAL: AdrenalPurpose = 'adrenal';
export const FORTITUDE: FortitudePurpose = 'fortitude';

/**
 * What a maneuver is for: the frenzy (workspace spec 040), a combat talent (workspace spec 076), an escape from a
 * grapple or the control of a fall (workspace spec 077), a feat of strength, an adrenal move or Fortitude (spec 079).
 */
export type ManeuverPurpose =
  FrenzyPurpose | CombatTalentPurpose | GrapplePurpose | FallControlPurpose | FeatOfStrengthPurpose | AdrenalPurpose | FortitudePurpose;

export const MANEUVER_PURPOSES: ManeuverPurpose[] = [
  ...FRENZY_PURPOSES,
  ...COMBAT_TALENT_PURPOSES,
  GRAPPLE_ESCAPE,
  FALL_CONTROL,
  FEAT_OF_STRENGTH,
  ADRENAL,
  FORTITUDE,
];

export const isFrenzyPurpose = (purpose: ManeuverPurpose | undefined): purpose is FrenzyPurpose =>
  !!purpose && (FRENZY_PURPOSES as string[]).includes(purpose);

export const isCombatTalentPurpose = (purpose: ManeuverPurpose | undefined): purpose is CombatTalentPurpose =>
  !!purpose && (COMBAT_TALENT_PURPOSES as string[]).includes(purpose);

/** Where a Precision attacker stands: the foe's rear, flank or front. */
export type PrecisionPosition = 'rear' | 'flank' | 'front';

export const PRECISION_POSITIONS: PrecisionPosition[] = ['rear', 'flank', 'front'];
