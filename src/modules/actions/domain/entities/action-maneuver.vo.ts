import { ActionStatus } from './action-status.vo';
import { ManeuverDifficulty } from './maneuver-dificulty.vo';
import { ManeuverType } from './maneuver-type.vo';

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
