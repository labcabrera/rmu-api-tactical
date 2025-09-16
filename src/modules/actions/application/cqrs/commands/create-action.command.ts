import { ActionType } from '../../../domain/value-objects/action-type.vo';
import { ManeuverType } from '../../../domain/value-objects/maneuver-type.vo';

export class CreateActionCommand {
  gameId: string;
  actorId: string;
  actionType: ActionType;
  phaseStart: number;
  maneuver: CreateActionCommandManeuver | undefined;
  description: string;
  userId: string;
  roles: string[];
}

export class CreateActionCommandManeuver {
  skillId: string;
  maneuverType: ManeuverType;
}
