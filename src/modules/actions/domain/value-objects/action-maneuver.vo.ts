import { ActionRoll } from './action-roll.vo.js';
import type { Difficulty } from './difficulty.vo.js';
import type { LightType } from './light-type.vo.js';
import type { LightManeuverModifier } from './light-maneuver-modifier.vo.js';
import type { ManeuverModifierSelection } from './maneuver-profile.vo.js';
import type { ManeuverType } from './maneuver-type.vo.js';

export class ActionManeuver {
  constructor(
    public modifiers: ActionManeuverModifiers,
    public roll?: ActionRoll | undefined,
    public result?: ActionManeuverResult | undefined,
    /** Percent maneuvers (§4.4 of spec 010): percent accumulated, including the actions it continues. */
    public progress?: number | undefined,
    /** Percent maneuver of an earlier action that this one continues. */
    public continuesActionId?: string | undefined,
  ) {}
}

export class ActionManeuverModifiers {
  constructor(
    public skillId: string,
    public maneuverType: ManeuverType,
    public difficulty?: Difficulty | undefined,
    public customBonus?: number | undefined,
    /** How the skill uses light: from the skill's maneuver profile (or the legacy request). */
    public lightModifier?: LightManeuverModifier | undefined,
    public light?: LightType | undefined,
    /** @deprecated Legacy flag of a fixed -10; the armor maneuver penalty now comes from the character sheet. */
    public armorModifier?: boolean | undefined,
    public specialization?: string | null | undefined,
    /** Choices for the skill's catalog modifiers, by modifier key. */
    public selections?: Record<string, ManeuverModifierSelection> | undefined,
    /** Conflicting maneuver: total of the passive side. */
    public passiveTotal?: number | undefined,
  ) {}
}

export class ActionManeuverResult {
  constructor(
    public result?: string | undefined,
    public percent?: number | undefined,
    public message?: string | undefined,
    /** Absolute maneuvers: effects of the result table entry. */
    public effects?: ActionManeuverEffect[] | undefined,
    /** Percent maneuvers: severity of the critical taken. */
    public critical?: string | null | undefined,
    /** Percent maneuvers: the accumulated progress reached 100. */
    public completed?: boolean | undefined,
    /** Unmodified 66 on an absolute maneuver. */
    public unusualEvent?: boolean | undefined,
  ) {}
}

/** Effect of an absolute maneuver result, as core returns it. */
export interface ActionManeuverEffect {
  status: string;
  value?: number;
  modifier?: string;
  rounds?: number;
  roundDelay?: number;
}
