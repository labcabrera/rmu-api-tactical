import { ActionType, ManeuverType } from '../../domain/entities/action.entity';

export class CreateActionCommand {
  gameId: string;
  characterId: string;
  actionType: ActionType;
  phaseStart: number;
  actionPoints: number;
  attacks: CreateActionCommandAttack[] | undefined;
  maneuvers: CreateActionCommandManeuver[] | undefined;
  userId: string;
  roles: string[];
}

export class CreateActionCommandAttack {
  attackType: string;
  targetId: string;
  parry: number;
}

export class CreateActionCommandManeuver {
  skillId: string;
  maneuverType: ManeuverType;
}
