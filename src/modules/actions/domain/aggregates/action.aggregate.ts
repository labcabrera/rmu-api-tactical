import { randomUUID } from 'crypto';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { AggregateRoot } from '../../../shared/domain/entities/aggregate-root';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors';
import { ActionAttack, ActionParry } from '../value-objects/action-attack.vo';
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
    public parries: ActionParry[] | undefined,
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

  processParryOptions(targets: ActorRound[]) {
    //TODO check if attacking in last phase
    //TODO process protectors
    if (!this.attacks || this.attacks.length === 0) {
      return;
    }
    this.parries = [];
    targets
      .filter((t) => t.actorId !== this.actorId)
      .forEach((t) => {
        t.attacks.forEach((attack) => {
          this.parries!.push(new ActionParry(randomUUID(), t.actorId, this.actorId, 'parry', attack.attackName, attack.currentBo, 0));
        });
      });
  }

  hasPendingAttackRolls(): boolean {
    if (this.actionType !== 'attack') throw new ValidationError('Action is not an attack');
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    return this.attacks.some((a) => !a.roll || !a.roll.roll);
  }

  hasPendingCriticalRolls(): boolean {
    if (this.actionType !== 'attack') throw new ValidationError('Action is not an attack');
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    this.attacks.forEach((a) => {
      if (a.roll && a.roll.criticalRolls && a.roll.criticalRolls.size > 0) {
        const hasUndefined = Array.from(a.roll.criticalRolls.values()).some((v) => v === undefined);
        if (hasUndefined) {
          return true;
        }
      }

      if (!a.roll || !a.roll.criticalRolls) {
        throw new ValidationError(`Attack ${a.modifiers.attackName} has no criticals declared`);
      }
    });
    return false;
  }

  hasPendingFumbleRolls(): boolean {
    // TODO implement fumble rolls
    return false;
  }

  getAttackByName(attackName: string): ActionAttack {
    if (!this.attacks) throw new ValidationError('Action has no attacks declared');
    const result = this.attacks.find((a) => a.modifiers.attackName === attackName);
    if (!result) throw new ValidationError(`Attack ${attackName} not found in action ${this.id}`);
    return result;
  }

  checkValidParryDeclaration() {
    //this.checkValidAttack('in_progress');
  }

  checkValidRollDeclaration() {
    //this.checkValidAttack('in_progress');
  }

  checkValidCriticalRollDeclaration(attackName: string, criticalKey: string, roll: number) {
    //this.checkValidAttack('in_progress');
    if (!attackName) throw new ValidationError('Attack name is required');
    if (!criticalKey) throw new ValidationError('Critical key is required');
    if (!roll || roll < 1 || roll > 100) throw new ValidationError('Critical roll must be between 1 and 100');
    const attack = this.attacks!.find((a) => a.modifiers.attackName === attackName);
    if (!attack) throw new ValidationError(`Attack ${attackName} not found in action ${this.id}`);
    if (!attack.roll || !attack.roll.roll) {
      throw new ValidationError(`Main roll not found in attack ${attackName} of action ${this.id}`);
    }
    if (!attack.roll.criticalRolls || !attack.roll.criticalRolls.has(criticalKey)) {
      throw new ValidationError(`Critical ${criticalKey} not found in attack ${attackName} of action ${this.id}`);
    }
  }

  checkValidApplyResults() {
    if (this.actionType !== 'attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (this.status === 'completed') {
      throw new ValidationError('Attack already completed');
    }
  }

  processFatigue(fatigueMultiplier: number | undefined): void {
    if (!this.actionPoints) {
      throw new Error('Action does not have action points defined');
    }
    let value: number | undefined = undefined;
    switch (this.actionType) {
      case 'movement':
        value = this.getMovementFatigue();
        break;
      case 'attack':
        value = this.getCombatFatigue();
        break;
    }
    if (value) {
      value = this.actionPoints * value;
    }
    if (value && fatigueMultiplier) {
      value = value * fatigueMultiplier;
    }
    this.fatigue = value;
  }

  private getCombatFatigue(): number | undefined {
    if (!this.attacks || this.attacks.length === 0) {
      throw new UnprocessableEntityError('Action does not have attack data');
    }
    // check every 6 rounds only for melee attacks
    return this.attacks.some((e) => e.modifiers.type === 'melee') ? 4.16 : undefined;
  }

  applyParrysToAttacks() {
    this.attacks?.forEach((attack) => {
      const targetId = attack.modifiers.targetId;
      const totalParry = this.parries?.filter((p) => p.targetActorId === targetId).reduce((sum, p) => sum + p.parry, 0) || 0;
      attack.modifiers.parry = totalParry;
    });
  }

  private getAvailableParry(actor: ActorRound): number {
    const list = actor.attacks.map((attack) => attack.currentBo);
    return Math.min(...list);
  }

  private getMovementFatigue(): number | undefined {
    if (this.movement?.modifiers.skillId) {
      switch (this.movement.modifiers.skillId) {
        case 'climbing':
        case 'swimming':
          // check every 5 min
          return 4.16;
        default:
          break;
      }
    }
    return this.getRunningFatigue();
  }

  private getRunningFatigue(): number | undefined {
    if (!this.movement || !this.movement.modifiers || !this.movement.modifiers.pace) {
      throw new Error('Action does not have movement data');
    }
    switch (this.movement.modifiers.pace) {
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
