import { ManeuverDifficulty } from '../../../domain/value-objects/maneuver-dificulty.vo';

export class PrepareManeuverCommand {
  actionId: string;
  difficulty: ManeuverDifficulty;
  userId: string;
  roles: string[];
}
