import { ActionAttack } from './action-attack.vo';
import { ActionManeuver } from './action-maneuver.vo';
import { ActionMovement } from './action-movement.vo';
import { ActionStatus } from './action-status.vo';
import { ActionType } from './action-type.vo';

export class Action {
  constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly round: number,
    public readonly actionType: ActionType,
    public readonly phaseStart: number,
    public phaseEnd: number | undefined,
    public status: ActionStatus,
    public actionPoints: number | undefined,
    public movement: ActionMovement | undefined,
    public attacks: ActionAttack[] | undefined,
    public maneuver: ActionManeuver | undefined,
    public fatigue: number | undefined,
    public description: string | undefined,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
    public owner: string,
  ) {}
}
