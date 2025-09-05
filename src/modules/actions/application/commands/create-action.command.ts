import { ActionType, ManeuverType } from '../../domain/entities/action.entity';

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
