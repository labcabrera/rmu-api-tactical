import { ManeuverDifficulty } from '../../domain/entities/action.entity';

export class PrepareManeuverCommand {
  actionId: string;
  difficulty: ManeuverDifficulty;
  userId: string;
  roles: string[];
}
