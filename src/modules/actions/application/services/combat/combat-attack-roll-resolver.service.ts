import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objets/actor-round-attack.vo';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionAttackRoll } from '../../../domain/value-objects/action-attack-roll.vo';
import { ActionAttack, ActionAttackResult, Fumble } from '../../../domain/value-objects/action-attack.vo';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';
import { Critical } from '../../../domain/value-objects/critical.vo';
import type { AttackTablePort } from '../../ports/attack-table.port';
import { CombatContext } from './combat-context';
import { CombatModifierBag } from './combat-modifier-bag';
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

  /**
   * Resolves an attack roll: runs `beforeAttackRoll`, adds the roll to the prepared modifiers, detects the fumble
   * or looks the total up in the attack table, runs `afterAttackRoll` and creates the criticals the context holds.
   * The rules (armour by location, absolute hit, size, critical expansion...) are plugins.
   */
  async resolve(input: ResolveAttackRollInput): Promise<CombatContext> {
    const attack = input.attack;
    const calculated = attack.calculated!;
    let ctx: CombatContext = {
      action: input.action,
      attack,
      attackRoll: input.roll,
      locationRoll: input.locationRoll,
      sourceActor: input.sourceActor,
      targetActor: input.targetActor,
      sourceAttack: this.getSourceAttack(input.sourceActor, attack.attackName),
      location: calculated.requiredLocationRoll && input.locationRoll ? this.getLocation(input.locationRoll) : undefined,
      armorType: input.targetActor.defense.at,
      trace: [],
    };
    this.resetPreviousRoll(ctx);

    ctx = await this.combatProcessor.runPhase('beforeAttackRoll', ctx);
    ctx.rollTotal = ctx.attackRoll! + CombatModifierBag.from(calculated.rollModifiers).sum();
    calculated.location = ctx.location;
    calculated.rollTotal = ctx.rollTotal;
    attack.roll = new ActionAttackRoll(ctx.attackRoll!, ctx.locationRoll, undefined, undefined);

    if (this.isFumble(ctx)) {
      attack.results = new ActionAttackResult(undefined, undefined, new Fumble('pending_roll', undefined, undefined, undefined, undefined));
    } else {
      ctx.attackTableEntry = await this.attackTablePort.lookup({
        attackTable: ctx.sourceAttack!.attackTable,
        attackSize: ctx.sourceAttack!.attackSize,
        roll: ctx.rollTotal,
        armor: ctx.armorType ?? undefined,
        location: ctx.location,
      });
      attack.results = new ActionAttackResult(ctx.attackTableEntry, undefined, undefined);
    }

    ctx = await this.combatProcessor.runPhase('afterAttackRoll', ctx);
    this.createCriticals(ctx);
    calculated.criticalAdjustment = CombatModifierBag.from(calculated.criticalModifiers).sum() || undefined;
    ctx.action.refreshAttackStatuses();

    return ctx;
  }

  /** A new roll replaces the previous one: its results and what the roll phases added. */
  private resetPreviousRoll(ctx: CombatContext): void {
    const calculated = ctx.attack!.calculated!;
    calculated.breakageRoll = undefined;
    calculated.criticalModifiers = (calculated.criticalModifiers || []).filter(modifier => modifier.group !== 'resolution');
    ctx.attack!.results = undefined;
    ctx.attack!.status = 'pending_attack_roll';
  }

  private getSourceAttack(sourceActor: ActorRound, attackName: string): ActorRoundAttack {
    const attack = sourceActor.attacks?.find(a => a.attackName === attackName);
    if (!attack) {
      throw new ValidationError(`Attack ${attackName} not found on actor ${sourceActor.actorId}`);
    }
    return attack;
  }

  private isFumble(ctx: CombatContext): boolean {
    const fumble = ctx.sourceAttack!.fumble || 0;
    return fumble > 0 && ctx.attackRoll! <= fumble;
  }

  private createCriticals(ctx: CombatContext): void {
    const criticalType = ctx.attackTableEntry?.criticalType;
    if (!criticalType || !ctx.criticalSeverities?.length) {
      return;
    }
    const criticals = ctx.criticalSeverities.map(
      (severity, index) =>
        new Critical(
          `${criticalType}_${severity}_${index + 1}`.toLowerCase(),
          'pending_roll',
          criticalType,
          severity,
          undefined,
          undefined,
        ),
    );
    ctx.attack!.results!.criticals = criticals;
    ctx.attack!.roll!.criticalRolls = new Map(criticals.map(critical => [critical.key, undefined]));
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
