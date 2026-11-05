import { ActionRoll } from './action-roll.vo.js';
import type { Difficulty } from './difficulty.vo.js';
import type { LightType } from './light-type.vo.js';
import type { LightManeuverModifier } from './light-maneuver-modifier.vo.js';
import type { ManeuverModifierSelection } from './maneuver-profile.vo.js';
import type { ManeuverType } from './maneuver-type.vo.js';
import type { ManeuverPurpose, PrecisionPosition } from './maneuver-purpose.vo.js';

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
    /** Actor the maneuver is against (workspace spec 022, decision 12): its sheet gives the passive total. */
    public targetActorId?: string | undefined,
    /** Skill of the passive side computed from the target actor. */
    public passiveSkillId?: string | undefined,
    /** Workspace spec 040: an Adrenal Focus maneuver to enter or leave the frenzy. */
    public purpose?: ManeuverPurpose | undefined,
    /** Workspace spec 076, §2.6: the foe of Sense Weakness, Study Offense or Precision. */
    public foeActorId?: string | undefined,
    /** Battle Cry: level of the highest level foe. */
    public foeLevel?: number | undefined,
    /** Precision: position of the attacker and OB given up. */
    public position?: PrecisionPosition | undefined,
    public obPenalty?: number | undefined,
  ) {}
}

/** The talent that changed the result of the roll (workspace spec 076, §2.8). */
export type ManeuverRollTalent = 'unusual-luck' | 'absolute-ease' | 'absolute-disaster';

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
    /** `price` maneuvers (Trading): price as a percent of the asked one (workspace spec 022, decision 11). */
    public price?: number | undefined,
    /** `morale` maneuvers (Leadership): outcome key of the morale table and its modifier to later morale rolls. */
    public outcome?: string | undefined,
    public moraleModifier?: number | undefined,
    public moraleModifierDays?: number | undefined,
    /** Workspace spec 076: the talent that changed the result of the table (Unusual Luck, Absolute Ease or Disaster). */
    public rollTalent?: ManeuverRollTalent | undefined,
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
