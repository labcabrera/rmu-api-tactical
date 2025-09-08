import { ActionStatus, ManeuverDifficulty, ManeuverType } from './action.aggregate';

export class ActionManeuver {
  constructor(
    public skillId: string,
    public maneuverType: ManeuverType,
    public difficulty: ManeuverDifficulty | undefined,
    public result: ActionManeuverResult | undefined,
    public status: ActionStatus,
  ) {}
}

export class ActionManeuverResult {
  bonus: { [key: string]: number };
  roll: number;
  result: number;
  description: string;
}
