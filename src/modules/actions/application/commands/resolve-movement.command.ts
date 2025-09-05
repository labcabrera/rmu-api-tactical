export class ResolveMovementCommand {
  actionId: string;
  phase: number;
  pace: string;
  requiredManeuver: boolean;
  difficulty: string | undefined;
  skillId: string | undefined;
  customBonus: number | undefined;
  roll: number | undefined;
  description: string | undefined;
  userId: string;
  roles: string[];
}
