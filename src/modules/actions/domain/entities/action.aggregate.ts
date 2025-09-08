import { randomUUID } from 'crypto';
import { AggregateRoot } from '../../../shared/domain/entities/aggregate-root';
import { ActionAttack } from './action-attack.vo';
import { ActionManeuver } from './action-maneuver.vo';
import { ActionMovement } from './action-movement.vo';
import { ActionStatus } from './action-status.vo';
import { ActionType } from './action-type.vo';

export class Action extends AggregateRoot<Action> {
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
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | undefined,
  ) {
    super();
  }

  static create(
    gameId: string,
    actorId: string,
    round: number,
    actionType: ActionType,
    phaseStart: number,
    movement: ActionMovement | undefined,
    attacks: ActionAttack[] | undefined,
    maneuver: ActionManeuver | undefined,
    description: string | undefined,
    owner: string,
  ) {
    const action = new Action(
      randomUUID(),
      gameId,
      actorId,
      round,
      actionType,
      phaseStart,
      undefined,
      'in_progress',
      undefined,
      movement,
      attacks,
      maneuver,
      undefined,
      description,
      owner,
      new Date(),
      undefined,
    );
    return action;
  }
}
