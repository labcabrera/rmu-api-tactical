import { ActionType, ManeuverType } from '../../domain/entities/action.entity';

export class CreateActionCommand {
  gameId: string;
  actorId: string;
  actionType: ActionType;
  phaseStart: number;
  actionPoints: number;
  attacks: CreateActionCommandAttack[] | undefined;
  maneuver: CreateActionCommandManeuver | undefined;
  userId: string;
  roles: string[];
}

export class CreateActionCommandAttack {
  attackName: string;
  targetId: string;
  parry: number;
}

export class CreateActionCommandManeuver {
  skillId: string;
  maneuverType: ManeuverType;
}
