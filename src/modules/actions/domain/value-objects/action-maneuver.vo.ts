import type { KeyValueModifier } from './key-value-modifier.vo.js';
import { ActionRoll } from './action-roll.vo.js';
import type { Difficulty } from './difficulty.vo.js';
import type { LightType } from './light-type.vo.js';
import type { LightManeuverModifier } from './light-maneuver-modifier.vo.js';
import type { ManeuverModifierSelection } from './maneuver-profile.vo.js';
import type { ManeuverType } from './maneuver-type.vo.js';
import type { ManeuverPurpose, PrecisionPosition } from './maneuver-purpose.vo.js';
import type { ComplementaryChoice, SimilarityChoice } from '../services/skill-aids.js';
import type { FeatOfStrengthChoices, FeatOfStrengthResult } from '../services/feat-of-strength.js';
import type { AdrenalKind } from '../services/adrenal-maneuver.js';

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
    /** Workspace spec 079, decision B1: the skill the similar skill rolled stands for. */
    public similarity?: SimilarityChoice | undefined,
    /** Workspace spec 079, decision B1: the helpers of complementary skills. */
    public complementary?: ComplementaryChoice[] | undefined,
    /** Workspace spec 079, decision B2: the load of a feat of strength. */
    public featOfStrength?: FeatOfStrengthChoices | undefined,
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
    /** Workspace spec 077, decision A3.3: one result per grapple of an escape. */
    public grappleEscape?: GrappleEscapeResult[] | undefined,
    /**
     * Workspace spec 077, decision D4: steps a `fall-control` maneuver moves the critical of the fall: +1 on an absolute
     * failure, -1 on a success, -2 on an absolute success, 0 otherwise.
     */
    public fallControlSteps?: number | undefined,
    /** Workspace spec 079, decision B2: how the difficulty of a feat of strength was found. */
    public featOfStrength?: FeatOfStrengthResult | undefined,
    /** Workspace spec 079, decisions B3-B4: what an adrenal or Fortitude maneuver gave its actor. */
    public adrenal?: AdrenalManeuverOutcome | undefined,
  ) {}
}

/** What an adrenal move or Fortitude gave (workspace spec 079, decisions B3-B4). */
export interface AdrenalManeuverOutcome {
  kind: AdrenalKind | 'fortitude';
  /** Rounds of the benefit (0 without one). */
  rounds: number;
  /** First round of the benefit: the next one for an adrenal move, the current one for Fortitude. */
  fromRound?: number;
  /** The first round is doubled (absolute success). */
  doubled?: boolean;
  /** Half the benefit (partial success). */
  partial?: boolean;
  /** An absolute failure blocked the skill (-25 for the rest of the combat). */
  block?: boolean;
  /** An absolute success lifted the block the skill had. */
  blockLifted?: boolean;
  /** Fatigue added by an absolute failure of Fortitude. */
  fatigue?: number;
}

/** The roll against one grapple of an escape maneuver (workspace spec 077, decision A3.3). */
export interface GrappleEscapeResult {
  effectId: string;
  /** The grappler; none for an object. */
  grapplerId?: string;
  roll: number;
  difficulty: string;
  /** Total of the grappler's side, which adds 100 less it. */
  passiveTotal?: number;
  total: number;
  modifiers: KeyValueModifier[];
  /** Percent of the table, taken off the grapple. */
  percent: number;
  critical?: string | null;
  message?: string;
  /** Percent of the grapple left. */
  remaining: number;
  released: boolean;
  /** An absolute failure of Contortions tightened the grapple (decision A3.6). */
  tightened?: boolean;
}

/** Effect of an absolute maneuver result, as core returns it. */
export interface ActionManeuverEffect {
  status: string;
  value?: number;
  modifier?: string;
  rounds?: number;
  roundDelay?: number;
}
