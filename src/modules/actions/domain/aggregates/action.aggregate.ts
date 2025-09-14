import { randomUUID } from 'crypto';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { AggregateRoot } from '../../../shared/domain/entities/aggregate-root';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors';
import { ActionAttack, ActionAttackParry } from '../value-objects/action-attack.vo';
import { ActionManeuver } from '../value-objects/action-maneuver.vo';
import { ActionMovement } from '../value-objects/action-movement.vo';
import { ActionStatus } from '../value-objects/action-status.vo';
import { ActionType } from '../value-objects/action-type.vo';

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

  processFatigue(action: Action, fatigueMultiplier: number | undefined): void {
    if (!action.actionPoints) {
      throw new Error('Action does not have action points defined');
    }
    let value: number | undefined = undefined;
    switch (action.actionType) {
      case 'movement':
        value = this.getMovementFatigue(action);
        break;
      case 'attack':
        value = this.getCombatFatigue(action);
        break;
    }
    if (value) {
      value = action.actionPoints * value;
    }
    if (value && fatigueMultiplier) {
      value = value * fatigueMultiplier;
    }
    action.fatigue = value;
  }

  private getCombatFatigue(action: Action): number | undefined {
    if (!action.attacks || action.attacks.length === 0) {
      throw new UnprocessableEntityError('Action does not have attack data');
    }
    // check every 6 rounds only for melee attacks
    return action.attacks.some((e) => e.modifiers.type === 'melee') ? 4.16 : undefined;
  }

  private getMovementFatigue(action: Action): number | undefined {
    if (action.movement?.modifiers.skillId) {
      switch (action.movement.modifiers.skillId) {
        case 'climbing':
        case 'swimming':
          // check every 5 min
          return 4.16;
        default:
          break;
      }
    }
    return this.getRunningFatigue(action);
  }

  private getRunningFatigue(action: Action): number | undefined {
    if (!action.movement || !action.movement.modifiers || !action.movement.modifiers.pace) {
      throw new Error('Action does not have movement data');
    }
    switch (action.movement.modifiers.pace) {
      case 'jog':
        // check every 5 min
        return 0.14;
      case 'run':
        // check every 1 min
        return 4.16;
      case 'sprint':
        // check every 2 rounds
        return 12.5;
      case 'dash':
        // check every round
        return 25;
    }
    return undefined;
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
