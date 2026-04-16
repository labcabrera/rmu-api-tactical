import { AggregateRoot } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';
import { ActorRound } from '../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { UnprocessableEntityError, ValidationError } from '../../../shared/domain/errors';
import { DomainEvent } from '../../../shared/domain/events/domain-event';
import { ActionCreatedEvent } from '../events/action-events';
import { ActionParry } from '../value-objects/action-attack-parry.vo';
import { ActionAttack } from '../value-objects/action-attack.vo';
import { ActionManeuver } from '../value-objects/action-maneuver.vo';
import { ActionMovement } from '../value-objects/action-movement.vo';
import { ActionStatus } from '../value-objects/action-status.vo';
import { ActionType } from '../value-objects/action-type.vo';

export interface ActionProps {
  id: string;
  gameId: string;
  actorId: string;
  round: number;
  actionType: ActionType;
  freeAction: boolean;
  phaseStart: number;
  phaseEnd: number | null;
  status: ActionStatus;
  actionPoints: number | null;
  movement: ActionMovement | null;
  attacks: ActionAttack[] | null;
  parries: ActionParry[] | null;
  maneuver: ActionManeuver | null;
  fatigue: number | null;
  description: string | null;
  owner: string;
  createdAt: Date;
  updatedAt: Date | null;
}

export class Action extends AggregateRoot<DomainEvent<Action>> {
  private constructor(
    public readonly id: string,
    public readonly gameId: string,
    public readonly actorId: string,
    public readonly round: number,
    public readonly actionType: ActionType,
    public readonly freeAction: boolean,
    public readonly phaseStart: number,
    public phaseEnd: number | null,
    public status: ActionStatus,
    public actionPoints: number | null,
    public movement: ActionMovement | null,
    public attacks: ActionAttack[] | null,
    public parries: ActionParry[] | null,
    public maneuver: ActionManeuver | null,
    public fatigue: number | null,
    public description: string | null,
    public owner: string,
    public readonly createdAt: Date,
    public updatedAt: Date | null,
  ) {
    super();
  }

  static create(
    gameId: string,
    actorId: string,
    round: number,
    actionType: ActionType,
    freeAction: boolean,
    phaseStart: number,
    maneuver: ActionManeuver | null,
    description: string | null,
    owner: string,
  ) {
    const action = new Action(
      randomUUID(),
      gameId,
      actorId,
      round,
      actionType,
      freeAction,
      phaseStart,
      null,
      'declared',
      null,
      null,
      null,
      null,
      maneuver,
      null,
      description,
      owner,
      new Date(),
      null,
    );
    action.apply(new ActionCreatedEvent(action));
    return action;
  }

  static fromProps(props: ActionProps): Action {
    return new Action(
      props.id,
      props.gameId,
      props.actorId,
      props.round,
      props.actionType,
      props.freeAction,
      props.phaseStart,
      props.phaseEnd,
      props.status,
      props.actionPoints,
      props.movement,
      props.attacks,
      props.parries,
      props.maneuver,
      props.fatigue,
      props.description,
      props.owner,
      props.createdAt,
      props.updatedAt,
    );
  }

  prepare() {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new Error('Action is not an attack');
    }
    if (this.status !== 'declared') {
      throw new Error('Action is not in a preparable state');
    }
  }

  setActionPoints(currentPhase: number) {
    if (this.freeAction) {
      this.actionPoints = 0;
    } else {
      this.actionPoints = currentPhase - this.phaseStart + 1;
    }
  }

  addAttacks(attackNames: string[] | undefined) {
    if (!attackNames || attackNames.length === 0) {
      return;
    }
    if (!this.attacks) {
      this.attacks = [];
    }
    attackNames.forEach(attackName => {
      const attack = {
        attackName: attackName,
        type: this.actionType === 'melee_attack' ? 'melee' : 'ranged',
        modifiers: {
          bo: 0,
          calledShot: 'none',
          calledShotPenalty: 0,
          positionalSource: 'none',
          positionalTarget: 'none',
          restrictedQuarters: 'none',
          cover: 'none',
          dodge: 'none',
          disabledDB: false,
          disabledShield: false,
          disabledParry: false,
          pace: 'creep',
          restrictedParry: false,
          higherGround: false,
          stunnedFoe: false,
          surprisedFoe: false,
          proneSource: false,
          proneTarget: false,
          offHand: attackName === 'offHand' ? true : false,
          ambush: false,
        },
        status: 'pending_attack_roll',
      } as ActionAttack;
      this.attacks!.push(attack);
    });
  }

  setAttackBo(attackName: string, currentBo: number) {
    if (!this.attacks) return;
    const attack = this.attacks?.find(a => a.attackName === attackName);
    if (!attack || !attack.modifiers) return;
    attack.modifiers.bo = currentBo;
  }

  processParryOptions(targets: ActorRound[], targetActions: Action[]) {
    //TODO process protectors
    if (!this.attacks || this.attacks.length === 0) {
      return;
    }
    this.parries = [];
    for (const target of targets) {
      // read last melee attack against this actor
      const lastMeleeAttack = targetActions.sort((a, b) => a.phaseStart - b.phaseStart).find(a => a.actionType === 'melee_attack');
      if (lastMeleeAttack) {
        // read min bo available from parry over all attacks
        const availableBo: number[] = [];
        for (const attack of lastMeleeAttack.attacks!) {
          availableBo.push(target.getCurrentBo(attack.attackName));
        }
        const minBo = Math.min(...availableBo);
        this.parries?.push(new ActionParry(randomUUID(), target.actorId, target.actorId, 'parry', minBo, 0));
      }
    }
  }

  hasPendingAttackRolls(): boolean {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    return this.attacks.some(a => !a.roll || !a.roll.roll);
  }

  hasPendingCriticalRolls(): boolean {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    this.attacks
      .filter(attack => attack.roll && attack.roll.criticalRolls && attack.roll.criticalRolls.size > 0)
      .forEach(attack => {
        const hasUndefined = Array.from(attack.roll!.criticalRolls!.values()).some(v => v === undefined);
        if (hasUndefined) {
          return true;
        }
      });
    return false;
  }

  hasPendingFumbleRolls(): boolean {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (!this.attacks || this.attacks.length === 0) throw new ValidationError('Action has no attacks declared');
    return this.attacks.some(attack => attack.results?.fumble && !attack.roll?.fumbleRoll);
  }

  getAttackByName(attackName: string): ActionAttack {
    if (!this.attacks) throw new ValidationError('Action has no attacks declared');
    const result = this.attacks.find(a => a.attackName === attackName);
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
    const attack = this.attacks!.find(a => a.attackName === attackName);
    if (!attack) throw new ValidationError(`Attack ${attackName} not found in action ${this.id}`);
    if (!attack.roll || !attack.roll.roll) {
      throw new ValidationError(`Main roll not found in attack ${attackName} of action ${this.id}`);
    }
    if (!attack.roll.criticalRolls || !attack.roll.criticalRolls.has(criticalKey)) {
      throw new ValidationError(`Critical ${criticalKey} not found in attack ${attackName} of action ${this.id}`);
    }
  }

  checkValidApplyResults() {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (this.status === 'completed') {
      throw new ValidationError('Attack already completed');
    }
  }

  processFatigue(fatigueMultiplier: number | null): void {
    if (!this.actionPoints) {
      throw new Error('Action does not have action points defined');
    }
    let value: number | null = null;
    switch (this.actionType) {
      case 'movement':
        value = this.getMovementFatigue();
        break;
      case 'melee_attack':
      case 'ranged_attack':
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

  private getCombatFatigue(): number | null {
    if (!this.attacks || this.attacks.length === 0) {
      throw new UnprocessableEntityError('Action does not have attack data');
    }
    // check every 6 rounds only for melee attacks
    return this.attacks.some(e => e.type === 'melee') ? 4.16 : null;
  }

  applyParrysToAttacks() {
    this.attacks?.forEach(attack => {
      const targetId = attack.modifiers.targetId;
      const totalParry = this.parries?.filter(p => p.targetActorId === targetId).reduce((sum, p) => sum + p.parry, 0) || 0;
      attack.modifiers.parry = totalParry;
    });
  }

  toProps(): ActionProps {
    return {
      id: this.id,
      gameId: this.gameId,
      actorId: this.actorId,
      round: this.round,
      actionType: this.actionType,
      freeAction: this.freeAction,
      phaseStart: this.phaseStart,
      phaseEnd: this.phaseEnd,
      status: this.status,
      actionPoints: this.actionPoints,
      movement: this.movement,
      attacks: this.attacks,
      parries: this.parries,
      maneuver: this.maneuver,
      fatigue: this.fatigue,
      description: this.description,
      owner: this.owner,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private getMovementFatigue(): number | null {
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

  private getRunningFatigue(): number | null {
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
    return null;
  }

  private checkValidAttack(expectedStatus: string) {
    if (this.actionType !== 'melee_attack' && this.actionType !== 'ranged_attack') {
      throw new ValidationError('Action is not an attack');
    } else if (this.status !== expectedStatus) {
      throw new ValidationError('Attack is not in progress');
    } else if (!this.attacks || this.attacks.length === 0) {
      throw new ValidationError('Attack has no attacks declared');
    }
  }
}
