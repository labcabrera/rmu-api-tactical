import type { LightType } from './light-type.vo.js';
import { ActionRoll } from './action-roll.vo.js';
import type { Difficulty } from './difficulty.vo.js';
import type { Pace } from './pace.vo.js';

/** Outcome of the Feat of Strength to move while grappled (workspace spec 077, decision A3.5). */
export type GrappleFeat = 'passed' | 'failed';

export const GRAPPLE_FEATS: GrappleFeat[] = ['passed', 'failed'];

export class ActionMovement {
  constructor(
    public modifiers: ActionMovementModifiers,
    public roll: ActionRoll | null,
    public calculated: ActionMovementResult,
  ) {}
}

export class ActionMovementModifiers {
  constructor(
    public pace: Pace,
    public requiredManeuver: boolean,
    public skillId: string | null,
    public difficulty: Difficulty | null,
    public customBonus: number | null,
    // Light of the environment (Table 5-1), helpful for movement maneuvers
    public light?: LightType | null,
    /**
     * Workspace spec 077, decision A3.5: the contested Feat of Strength of a grappled actor or its grappler to move away
     * (`failed`: it does not move).
     */
    public grappleFeat?: GrappleFeat | null,
  ) {}
}

/** Why the BMR of a movement changed: half movement (spec 034) or concentration (workspace spec 077, decision A2.3). */
export interface BmrMultiplier {
  key: 'half-movement' | 'concentration';
  value: number;
}

export class ActionMovementResult {
  constructor(
    public bmr: number,
    public paceMultiplier: number,
    public percent: number,
    public distance: number,
    public distanceAdjusted: number,
    public critical: string | null,
    public description: string,
    /** What changed the BMR of the actor (the `bmr` has them applied). */
    public bmrMultipliers?: BmrMultiplier[],
  ) {}
}
