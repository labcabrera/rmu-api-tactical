import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionAttackRoll } from '../../../domain/value-objects/action-attack-roll.vo.js';
import { ActionAttack, ActionAttackResult, Fumble } from '../../../domain/value-objects/action-attack.vo.js';
import { Critical } from '../../../domain/value-objects/critical.vo.js';
import { type AttackTablePort, ATTACK_TABLE_PORT } from '../../ports/attack-table.port.js';
import type { CombatContext } from './combat-context.js';
import { CombatModifierBag } from './combat-modifier-bag.js';
import { CombatProcessor } from './engine/combat-processor.service.js';

export interface ResolveAttackRollInput {
  action: Action;
  attack: ActionAttack;
  sourceActor: ActorRound;
  targetActor: ActorRound;
  roll: number;
}

@Injectable()
export class CombatAttackRollResolverService {
  constructor(
    private readonly combatProcessor: CombatProcessor,
    @Inject(ATTACK_TABLE_PORT) private readonly attackTablePort: AttackTablePort,
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
      sourceActor: input.sourceActor,
      targetActor: input.targetActor,
      sourceTraits: input.sourceActor.traits || [],
      targetTraits: input.targetActor.traits || [],
      sourceAttack: this.getSourceAttack(input.sourceActor, attack.attackName),
      armorType: input.targetActor.defense.at,
      trace: [],
    };
    this.resetPreviousRoll(ctx);

    ctx = await this.combatProcessor.runPhase('beforeAttackRoll', ctx);
    ctx.rollTotal = ctx.attackRoll! + CombatModifierBag.from(calculated.rollModifiers).sum();
    calculated.location = ctx.location;
    calculated.rollTotal = ctx.rollTotal;
    attack.roll = new ActionAttackRoll(ctx.attackRoll!, undefined, undefined);

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

  /** The fumble range computed when preparing (with the target's Foiler); the weapon's for older actions. */
  private isFumble(ctx: CombatContext): boolean {
    const fumble = ctx.attack?.calculated?.fumble ?? (ctx.sourceAttack!.fumble || 0);
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
}
