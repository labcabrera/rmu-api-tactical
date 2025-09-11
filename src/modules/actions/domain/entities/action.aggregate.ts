import { randomUUID } from 'crypto';
import { ActorRound } from '../../../actor-rounds/domain/entities/actor-round.aggregate';
import { AggregateRoot } from '../../../shared/domain/entities/aggregate-root';
import { ValidationError } from '../../../shared/domain/errors';
import { ActionAttack, ActionAttackParry } from './action-attack.vo';
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
      'declared',
      undefined,
      undefined,
      undefined,
      maneuver,
      undefined,
      description,
      owner,
      new Date(),
      undefined,
    );
    return action;
  }

  prepare() {
    if (this.actionType !== 'attack') {
      throw new Error('Action is not an attack');
    }
    if (this.status !== 'declared') {
      throw new Error('Action is not in a preparable state');
    }
  }

  processParryOptions(action: Action, actors: ActorRound[]) {
    //TODO check if attacking in last phase
    //TODO process protectors
    if (!action.attacks || action.attacks.length === 0) {
      return;
    }
    for (const attack of action.attacks) {
      attack.parries = [];
      if (!attack.modifiers.disabledParry) {
        const target = actors.find((a) => a.actorId === attack.modifiers.targetId);
        const availableParry = this.getAvailableParry(target!);
        attack.parries.push(new ActionAttackParry(target!.actorId, target!.actorId, 'parry', availableParry, 0));
      }
    }
  }

  private getAvailableParry(actor: ActorRound): number {
    const list = actor.attacks.map((attack) => attack.currentBo);
    return Math.max(...list, 0);
  }

  checkValidParryDeclaration() {
    this.checkValidAttack('in_progress');
  }

  checkValidRollDeclaration() {
    this.checkValidAttack('in_progress');
  }

  private checkValidAttack(expectedStatus: string) {
    if (this.actionType !== 'attack') {
      throw new ValidationError('Action is not an attack');
    } else if (this.status !== expectedStatus) {
      throw new ValidationError('Attack is not in progress');
    } else if (!this.attacks || this.attacks.length === 0) {
      throw new ValidationError('Attack has no attacks declared');
    }
  }
}
