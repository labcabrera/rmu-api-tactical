import { ActionRoll } from './action-roll.vo';
import { Difficulty } from './dificulty.vo';
import { LightType } from './light-type.vo';
import { LightManeuverModifier } from './ligth-maneuver-modifier.vo';
import { ManeuverType } from './maneuver-type.vo';

export class ActionManeuver {
  constructor(
    public modifiers: ActionManeuverModifiers,
    public roll?: ActionRoll | undefined,
    public result?: ActionManeuverResult | undefined,
  ) {}
}

export class ActionManeuverModifiers {
  constructor(
    public skillId: string,
    public maneuverType: ManeuverType,
    public difficulty?: Difficulty | undefined,
    public customBonus?: number | undefined,
    public lightModifier?: LightManeuverModifier | undefined,
    public light?: LightType | undefined,
    public armorModifier?: boolean | undefined,
  ) {}
}

export class ActionManeuverResult {
  constructor(
    public result?: string | undefined,
    public percent?: number | undefined,
    public message?: string | undefined,
  ) {}
}
