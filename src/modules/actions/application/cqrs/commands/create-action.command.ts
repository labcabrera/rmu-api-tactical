import { ActionType } from '../../../domain/value-objects/action-type.vo';
import { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';

export class CreateActionCommand {
  constructor(
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly actionType: ActionType,
    public readonly freeAction: boolean,
    public readonly phaseStart: number,
    public readonly maneuver: CreateActionCommandManeuver | undefined,
    public readonly attackNames: string[] | undefined,
    public readonly description: string,
    public readonly userId: string,
    public readonly roles: string[],
  ) {}
}

export class CreateActionCommandManeuver {
  skillId: string;
  /** Defaults to the skill's maneuver profile. */
  maneuverType?: ManeuverType;
  specialization?: string | null;
  /** Percent maneuver of an earlier action this one continues (§4.4 of spec 010). */
  continuesActionId?: string;
}
