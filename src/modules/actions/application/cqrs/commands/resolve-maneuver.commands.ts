import { ActionManeuverModifiers } from '../../../domain/value-objects/action-maneuver.vo';
import { SimpleRoll } from './simple-roll';

export class ResolveManeuverCommand {
  constructor(
    public readonly actionId: string,
    public readonly modifiers: ActionManeuverModifiers,
    public readonly roll: SimpleRoll,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}
