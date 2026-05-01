import { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import { LightType } from '../../../domain/value-objects/light-type.vo';
import { LightManeuverModifier } from '../../../domain/value-objects/ligth-maneuver-modifier.vo';
import { SimpleRoll } from './simple-roll';

export class ResolveManeuverModifiers {
  constructor(
    public difficulty: Difficulty | undefined,
    public lightModifier: LightManeuverModifier | undefined,
    public light: LightType | undefined,
    public armorModifier: boolean | undefined,
    public customBonus: number | undefined,
  ) {}
}

export class ResolveManeuverCommand {
  constructor(
    public readonly actionId: string,
    public readonly modifiers: ResolveManeuverModifiers,
    public readonly roll: SimpleRoll,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
