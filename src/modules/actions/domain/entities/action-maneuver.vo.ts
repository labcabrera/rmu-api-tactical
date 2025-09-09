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
  constructor(
    public bonus: { [key: string]: number },
    public roll: number,
    public result: number,
    public description: string,
  ) {}
}
