import { ManeuverDifficulty } from '../../domain/entities/maneuver-dificulty.vo';

export class PrepareManeuverCommand {
  actionId: string;
  difficulty: ManeuverDifficulty;
  userId: string;
  roles: string[];
}
