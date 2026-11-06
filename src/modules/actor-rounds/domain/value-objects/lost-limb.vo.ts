import type { BodySide, Pace } from './injury.vo.js';

/**
 * Workspace spec 079, C1 (§13.1 Amputation): a limb the actor lost for good, the model of the strategic character. A lost
 * arm is a useless limb (the warnings of the attacks) and a lost leg leaves the actor crawling. It comes from the
 * character into round 1, is copied from round to round and goes back with the outcome.
 */
export type LostLimbLocation = 'arm' | 'leg';
export const LOST_LIMB_LOCATIONS: LostLimbLocation[] = ['arm', 'leg'];

/** An amputation, or a limb-loss alert the game master confirmed (a tourniquet left too long, a critical). */
export type LostLimbCause = 'amputation' | 'limb-loss';

export interface LostLimb {
  location: LostLimbLocation;
  side: BodySide;
  at: string;
  cause?: LostLimbCause;
  gameDay?: number;
  tacticalGameId?: string;
  injuryId?: string;
}

/** §13.1: the pace of an actor with a lost leg (crawling; a crutch is for the game master). */
export const LOST_LEG_MAX_PACE: Pace = 'creep';

export const isLostLimbLocation = (location: string | undefined | null): location is LostLimbLocation =>
  location === 'arm' || location === 'leg';
