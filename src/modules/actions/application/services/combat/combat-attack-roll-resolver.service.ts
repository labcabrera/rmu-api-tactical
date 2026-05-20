import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionAttackRoll } from '../../../domain/value-objects/action-attack-roll.vo';
import { ActionAttack, ActionAttackResult } from '../../../domain/value-objects/action-attack.vo';
import { ActionStatus } from '../../../domain/value-objects/action-status.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { Critical } from '../../../domain/value-objects/critical.vo';
import type { AttackTablePort } from '../../ports/attack-table.port';
import { CombatContext } from './combat-context';
import { CombatProcessor } from './engine/combat-processor.service';

export interface ResolveAttackRollInput {
  action: Action;
  attack: ActionAttack;
  sourceActor: ActorRound;
  targetActor: ActorRound;
  roll: number;
  locationRoll: number | undefined;
}

@Injectable()
export class CombatAttackRollResolverService {
  private readonly locationMap: Array<{ range: [number, number]; location: AttackLocation }> = [
    { range: [1, 1], location: 'head' },
    { range: [2, 3], location: 'chest' },
    { range: [4, 5], location: 'abdomen' },
    { range: [6, 10], location: 'legs' },
    { range: [11, 15], location: 'arms' },
    { range: [16, 20], location: 'head' },
    { range: [21, 25], location: 'chest' },
    { range: [26, 35], location: 'abdomen' },
    { range: [36, 45], location: 'legs' },
    { range: [46, 55], location: 'arms' },
    { range: [56, 65], location: 'arms' },
    { range: [66, 66], location: 'abdomen' },
    { range: [67, 75], location: 'legs' },
    { range: [76, 80], location: 'chest' },
    { range: [81, 85], location: 'head' },
    { range: [86, 90], location: 'arms' },
    { range: [91, 95], location: 'legs' },
    { range: [96, 97], location: 'abdomen' },
    { range: [98, 99], location: 'chest' },
    { range: [100, 100], location: 'head' },
  ];

  constructor(
    private readonly combatProcessor: CombatProcessor,
    @Inject('AttackTablePort') private readonly attackTablePort: AttackTablePort,
  ) {}

  async resolve(input: ResolveAttackRollInput): Promise<CombatContext> {
    const sourceAttack = this.getSourceAttack(input.sourceActor, input.attack.attackName);
    let ctx: CombatContext = {
      action: input.action,
      attack: input.attack,
      attackRoll: input.roll,
      locationRoll: input.locationRoll,
      sourceActor: input.sourceActor,
      targetActor: input.targetActor,
      sourceAttack,
      trace: [],
    };

    ctx = await this.combatProcessor.runPhase('beforeAttackRoll', ctx);
    ctx.rollTotal = this.calculateRollTotal(ctx);

    ctx.location = ctx.attack!.calculated!.requiredLocationRoll ? this.getLocation(ctx.locationRoll!) : undefined;
    ctx.attack!.calculated!.location = ctx.location;

    //TODO
    const armor = ctx.targetActor?.defense.at || 1;

    ctx.attackTableEntry = await this.attackTablePort.lookup({
      attackTable: ctx.sourceAttack!.attackTable,
      attackSize: ctx.sourceAttack!.attackSize,
      roll: ctx.rollTotal,
      armor: armor,
      location: ctx.location,
    });

    this.applyAttackResult(ctx);

    this.prepareCriticalRolls(ctx);

    this.prepareFumbleRoll(ctx);

    ctx.attack!.status = this.calculateAttackStatus(ctx.attack!);
    ctx.action.status = this.calculateActionStatus(ctx.action);

    ctx = await this.combatProcessor.runPhase('afterAttackRoll', ctx);

    return ctx;
  }

  private getSourceAttack(sourceActor: ActorRound, attackName: string): ActorRoundAttack {
    const attack = sourceActor.attacks?.find(a => a.attackName === attackName);
    if (!attack) {
      throw new ValidationError(`Attack ${attackName} not found on actor ${sourceActor.actorId}`);
    }
    return attack;
  }

  private calculateRollTotal(ctx: CombatContext): number {
    const modifiers = ctx.attack?.calculated?.rollModifiers || [];
    const modifierTotal = modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
    return (ctx.attackRoll || 0) + modifierTotal;
  }

  private applyAttackResult(ctx: CombatContext): void {
    ctx.attack!.roll = new ActionAttackRoll(ctx.attackRoll!, ctx.locationRoll, undefined, undefined);
    ctx.attack!.calculated!.rollTotal = ctx.rollTotal!;
    ctx.attack!.results = new ActionAttackResult(ctx.attackTableEntry, undefined, undefined);
  }

  private prepareCriticalRolls(ctx: CombatContext): void {
    const entry = ctx.attackTableEntry;
    if (!entry?.criticalType || !entry.criticalSeverity) {
      return;
    }

    const key = `${entry.criticalType.toLowerCase()}_${entry.criticalSeverity.toLowerCase()}_1`;
    const critical = new Critical(key, 'pending_roll', entry.criticalType, entry.criticalSeverity, undefined, undefined);
    ctx.attack!.results!.criticals = [critical];
    ctx.attack!.roll!.criticalRolls = new Map<string, number | undefined>([[key, undefined]]);
  }

  private prepareFumbleRoll(ctx: CombatContext): void {
    if ((ctx.attackRoll || 0) > ctx.sourceAttack!.fumble) {
      return;
    }

    ctx.attack!.results!.fumble = {
      status: 'pending_roll',
      text: undefined,
      additionalDamageText: undefined,
      damage: undefined,
      effects: undefined,
    };
  }

  private calculateAttackStatus(attack: ActionAttack): ActionAttack['status'] {
    if (attack.roll?.criticalRolls && Array.from(attack.roll.criticalRolls.values()).some(value => value === undefined)) {
      return 'pending_critical_roll';
    }
    if (attack.results?.fumble && !attack.roll?.fumbleRoll) {
      return 'pending_fumble_roll';
    }
    return 'pending_apply';
  }

  private calculateActionStatus(action: Action): ActionStatus {
    if (action.hasPendingAttackRolls()) {
      return 'pending_roll';
    }
    if (action.attacks?.some(attack => attack.status === 'pending_critical_roll' || attack.status === 'pending_fumble_roll')) {
      return 'pending_roll';
    }
    return 'pending_apply';
  }

  private getLocation(locationRoll: number): AttackLocation | undefined {
    for (const entry of this.locationMap) {
      const [min, max] = entry.range;
      if (locationRoll >= min && locationRoll <= max) {
        return entry.location;
      }
    }

    return undefined;
  }
}
