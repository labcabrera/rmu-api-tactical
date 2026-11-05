import type { Difficulty } from '../../../domain/value-objects/difficulty.vo.js';
import type { LightType } from '../../../domain/value-objects/light-type.vo.js';
import type { LightManeuverModifier } from '../../../domain/value-objects/light-maneuver-modifier.vo.js';
import type { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo.js';
import type { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo.js';
import type { ManeuverPurpose } from '../../../domain/value-objects/maneuver-purpose.vo.js';
import type { CombatTalentChoices } from '../../../domain/services/combat-talent-maneuver.js';
import type { SenseChoices } from '../../../../shared/domain/senses/sense-modifiers.js';
import type { GrappleEscapeRow } from '../../../domain/services/grapple-escape.js';
import type { ComplementaryChoice, SimilarityChoice } from '../../../domain/services/skill-aids.js';
import type { FeatOfStrengthChoices } from '../../../domain/services/feat-of-strength.js';

/** The passive side of a conflicting maneuver as an actor of the game (workspace spec 022, decision 12). */
export interface PassiveSide {
  targetActorId: string;
  /** Open-ended roll of the target; required unless `passiveTotal` is sent. */
  roll?: number;
  /** Skill of the target: `social-awareness` by default, the active skill for Trading. */
  skillId?: string;
  /** Bonus of an actor without a sheet (NPC). */
  bonus?: number;
}

/** What the client chose for the roll (spec 010 §4.1). The API computes every value. */
export class ResolveManeuverRequest {
  constructor(
    public readonly difficulty: Difficulty | undefined,
    public readonly selections: Record<string, ManeuverModifierSelection> = {},
    public readonly light?: LightType | undefined,
    public readonly customBonus?: number | undefined,
    public readonly passiveTotal?: number | undefined,
    public readonly skillId?: string | undefined,
    public readonly specialization?: string | null | undefined,
    public readonly maneuverType?: ManeuverType | undefined,
    /** Legacy `modifiers` body: how the skill uses light, when its profile does not say. */
    public readonly lightUsage?: LightManeuverModifier | undefined,
    /** Workspace spec 022, decision 12: the passive side as an actor of the game, and its roll. */
    public readonly passive?: PassiveSide | undefined,
    /** Workspace spec 040: an Adrenal Focus maneuver to enter or leave the frenzy; spec 076: a combat talent. */
    public readonly purpose?: ManeuverPurpose | undefined,
    /** Workspace spec 076, §2.6: the choices of a combat talent maneuver. */
    public readonly combatTalent?: CombatTalentChoices | undefined,
    /** Workspace spec 076: the d10 rounds of the spasm of a natural 66 (Spasm); rolled here when left out. */
    public readonly spasmRounds?: number | undefined,
    /** Workspace spec 076, §3.1: the sense of a Perception or Tracking maneuver, its usage and selections. */
    public readonly senses?: SenseChoices | undefined,
    /** Workspace spec 077, decision A3.3: a `grapple-escape` maneuver rolls once against each grapple. */
    public readonly grappleEscape?: GrappleEscapeRow[] | undefined,
    /** Workspace spec 079, decision B1: the skill rolled is a similar one of `similarity.targetSkillId`. */
    public readonly similarity?: SimilarityChoice | undefined,
    /** Workspace spec 079, decision B1: helpers whose ranks add up (halved after the first). */
    public readonly complementary?: ComplementaryChoice[] | undefined,
    /** Workspace spec 079, decision B2: the load of a `feat-of-strength` maneuver. */
    public readonly featOfStrength?: FeatOfStrengthChoices | undefined,
  ) {}
}

export class ManeuverRoll {
  constructor(
    /** Total of the open-ended roll. */
    public readonly roll: number,
    /** First die, unmodified: 66 is an unusual event. */
    public readonly unmodified?: number | undefined,
    /** Workspace spec 076, §2.8: every die of the open-ended roll, checked with the actor's roll profile. */
    public readonly dice?: number[] | undefined,
  ) {}
}

export class ResolveManeuverCommand {
  constructor(
    public readonly actionId: string,
    public readonly request: ResolveManeuverRequest,
    public readonly roll: ManeuverRoll,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
