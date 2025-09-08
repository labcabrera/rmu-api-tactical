import { Pace } from '../../../domain/entities/action-movement.vo';

export class ResolveMovementCommand {
  actionId: string;
  phase: number;
  pace: Pace;
  requiredManeuver: boolean;
  difficulty: string | undefined;
  skillId: string | undefined;
  customBonus: number | undefined;
  roll: number | undefined;
  description: string | undefined;
  userId: string;
  roles: string[];
}
