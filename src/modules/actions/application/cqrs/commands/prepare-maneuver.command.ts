import { Difficulty } from '../../../domain/value-objects/dificulty.vo';

export class PrepareManeuverCommand {
  actionId: string;
  difficulty: Difficulty;
  userId: string;
  roles: string[];
}
