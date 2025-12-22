import { ActionType } from '../../../domain/value-objects/action-type.vo';
import { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';

export class CreateActionCommand {
  constructor(
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly actionType: ActionType,
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
  maneuverType: ManeuverType;
}
