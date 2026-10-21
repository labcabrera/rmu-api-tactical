import { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import { LightType } from '../../../domain/value-objects/light-type.vo';
import { LightManeuverModifier } from '../../../domain/value-objects/ligth-maneuver-modifier.vo';
import { ManeuverModifierSelection } from '../../../domain/value-objects/maneuver-profile.vo';
import { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';

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
  ) {}
}

export class ManeuverRoll {
  constructor(
    /** Total of the open-ended roll. */
    public readonly roll: number,
    /** First die, unmodified: 66 is an unusual event. */
    public readonly unmodified?: number | undefined,
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
