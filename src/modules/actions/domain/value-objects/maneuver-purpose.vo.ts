import { FRENZY_PURPOSES, type FrenzyPurpose } from './frenzy-purpose.vo.js';

/**
 * Maneuvers of the combat talents (workspace spec 076, decisions B7-B9, §2.6): Battle Cry (Influence, intimidation),
 * Sense Weakness and Study Offense (Perception against a foe) and Precision (Ambush against a foe).
 */
export type CombatTalentPurpose = 'battle-cry' | 'sense-weakness' | 'study-offense' | 'precision';

export const COMBAT_TALENT_PURPOSES: CombatTalentPurpose[] = ['battle-cry', 'sense-weakness', 'study-offense', 'precision'];

/** What a maneuver is for: the frenzy (workspace spec 040) or a combat talent (workspace spec 076). */
export type ManeuverPurpose = FrenzyPurpose | CombatTalentPurpose;

export const MANEUVER_PURPOSES: ManeuverPurpose[] = [...FRENZY_PURPOSES, ...COMBAT_TALENT_PURPOSES];

export const isFrenzyPurpose = (purpose: ManeuverPurpose | undefined): purpose is FrenzyPurpose =>
  !!purpose && (FRENZY_PURPOSES as string[]).includes(purpose);

export const isCombatTalentPurpose = (purpose: ManeuverPurpose | undefined): purpose is CombatTalentPurpose =>
  !!purpose && (COMBAT_TALENT_PURPOSES as string[]).includes(purpose);

/** Where a Precision attacker stands: the foe's rear, flank or front. */
export type PrecisionPosition = 'rear' | 'flank' | 'front';

export const PRECISION_POSITIONS: PrecisionPosition[] = ['rear', 'flank', 'front'];
