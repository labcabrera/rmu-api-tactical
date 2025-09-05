export class ResolveMovementCommand {
  actionId: string;
  phase: number;
  pace: string;
  requiredManeuver: boolean;
  difficulty: string | undefined;
  skillId: string | undefined;
  roll: number | undefined;
  userId: string;
  roles: string[];
}
