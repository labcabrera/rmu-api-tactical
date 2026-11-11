import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import { ActorRoundAttack } from '../../../../actor-rounds/domain/value-objects/actor-round-attack.vo.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionAttackRoll } from '../../../domain/value-objects/action-attack-roll.vo.js';
import { ActionAttack, ActionAttackResult, Fumble } from '../../../domain/value-objects/action-attack.vo.js';
import { Critical } from '../../../domain/value-objects/critical.vo.js';
import { type AttackTablePort, ATTACK_TABLE_PORT } from '../../ports/attack-table.port.js';
import { type CriticalLocationPort, CRITICAL_LOCATION_PORT } from '../../ports/critical-location.port.js';
import type { CombatContext } from './combat-context.js';
import { CombatModifierBag } from './combat-modifier-bag.js';
import { sourceAttackOf } from './combat-source-attack.js';
import { needsLocationRoll } from './plugins/combat-location-armor.plugin.js';
import { CombatProcessor } from './engine/combat-processor.service.js';
import { type DisarmResult, disarmResult } from '../../../domain/services/special-maneuvers.js';

export interface ResolveAttackRollInput {
  action: Action;
  attack: ActionAttack;
  sourceActor: ActorRound;
  targetActor: ActorRound;
  roll: number;
  /** First die of the high open-ended roll; `roll` when it is missing. */
  unmodified?: number;
  /** Every die of the open-ended roll, in order, when the client sends them. */
  dice?: number[];
  /**
   * Workspace spec 077, decision B2.1: the unmodified critical roll (1-100), required against a target with armour by
   * location without a called shot; its location decides the armour of the attack.
   */
  criticalRoll?: number;
}

@Injectable()
export class CombatAttackRollResolverService {
  constructor(
    private readonly combatProcessor: CombatProcessor,
    @Inject(ATTACK_TABLE_PORT) private readonly attackTablePort: AttackTablePort,
    @Inject(CRITICAL_LOCATION_PORT) private readonly criticalLocationPort: CriticalLocationPort,
  ) {}

  /**
   * Resolves an attack roll: runs `beforeAttackRoll`, adds the roll to the prepared modifiers, detects the fumble
   * or looks the total up in the attack table, runs `afterAttackRoll` and creates the criticals the context holds.
   * The rules (armour by location, absolute hit, size, critical expansion...) are plugins.
   */
  async resolve(input: ResolveAttackRollInput): Promise<CombatContext> {
    this.validateRoll(input);
    const attack = input.attack;
    const calculated = attack.calculated!;
    let ctx: CombatContext = {
      action: input.action,
      attack,
      attackRoll: input.roll,
      unmodifiedRoll: input.unmodified,
      attackDice: input.dice,
      sourceActor: input.sourceActor,
      targetActor: input.targetActor,
      sourceTraits: input.sourceActor.traits || [],
      targetTraits: input.targetActor.traits || [],
      sourceAttack: this.getSourceAttack(input.action, input.sourceActor, attack.attackName),
      armorType: input.targetActor.defense.at,
      locationRoll: input.criticalRoll,
      trace: [],
    };
    this.resetPreviousRoll(ctx);
    ctx.fumbled = this.isFumble(ctx);
    if (input.criticalRoll !== undefined && !ctx.fumbled && needsLocationRoll(attack, input.targetActor)) {
      ctx.criticalLocations = await this.criticalLocationPort.findLocations();
    }

    ctx = await this.combatProcessor.runPhase('beforeAttackRoll', ctx);
    ctx.rollTotal = ctx.attackRoll! + CombatModifierBag.from(calculated.rollModifiers).sum();
    calculated.location = ctx.location;
    calculated.rollTotal = ctx.rollTotal;
    attack.roll = new ActionAttackRoll(ctx.attackRoll!, undefined, undefined, input.unmodified);

    const disarm = ctx.fumbled ? null : this.resolveDisarm(ctx);
    if (ctx.fumbled || disarm === 'absolute-failure') {
      // Table 9-7a: an absolute failure of a disarm fumbles the weapon, through the fumble roll of the attack.
      attack.results = new ActionAttackResult(undefined, undefined, new Fumble('pending_roll', undefined, undefined, undefined, undefined));
    } else if (disarm && disarm !== 'partial') {
      // Table 9-7a: a disarm that fails or succeeds makes no attack; its effects come when it is applied.
      attack.results = new ActionAttackResult(undefined, undefined, undefined);
    } else {
      ctx.attackTableEntry = await this.attackTablePort.lookup({
        attackTable: ctx.sourceAttack!.attackTable,
        roll: ctx.rollTotal,
        armor: ctx.armorType ?? undefined,
        location: ctx.location,
      });
      attack.results = new ActionAttackResult(ctx.attackTableEntry, undefined, undefined);
    }

    ctx = await this.combatProcessor.runPhase('afterAttackRoll', ctx);
    // The plugins change the entry (the damage scaled by size, the severity shifted); the attack loaded from Mongo
    // holds a copy of it, so the final entry is written back.
    if (ctx.attackTableEntry && attack.results) {
      attack.results.attackTableEntry = ctx.attackTableEntry;
    }
    this.createCriticals(ctx);
    calculated.criticalAdjustment = CombatModifierBag.from(calculated.criticalModifiers).sum() || undefined;
    ctx.action.refreshAttackStatuses();

    return ctx;
  }

  /**
   * The attack is a high open-ended d100 (Arms Law, ch. 7), so its total is never below 1. A lower total only comes from a
   * roll that was also open-ended downwards, and without its first die the fumble cannot be told.
   */
  private validateRoll(input: ResolveAttackRollInput): void {
    if (input.unmodified === undefined && input.roll < 1) {
      throw new ValidationError(`Attack roll ${input.roll} is below 1 and has no unmodified roll`);
    }
  }

  /**
   * Workspace spec 079, decision A7: a disarm reads its total on the bands of Table 9-7a. A partial success becomes a
   * normal attack with the same roll and every modifier but the disarm ones, which `ctx.rollTotal` takes. Null when the
   * attack is not a disarm.
   */
  private resolveDisarm(ctx: CombatContext): DisarmResult | null {
    const attack = ctx.attack!;
    attack.disarm = null;
    if ((attack.modifiers.attackMode ?? 'normal') !== 'disarm') {
      return null;
    }
    const total = ctx.rollTotal!;
    const result = disarmResult(total);
    const disarmModifiers = (attack.calculated!.rollModifiers || []).filter(modifier => modifier.source === 'disarm');
    const attackTotal = result === 'partial' ? total - CombatModifierBag.from(disarmModifiers).sum() : null;
    attack.disarm = { result, total, attackTotal, unusual: (ctx.unmodifiedRoll ?? ctx.attackRoll) === 66 };
    if (attackTotal !== null) {
      ctx.rollTotal = attackTotal;
    }
    return result;
  }

  /** A new roll replaces the previous one: its results and what the roll phases added. */
  private resetPreviousRoll(ctx: CombatContext): void {
    const calculated = ctx.attack!.calculated!;
    calculated.breakageRoll = undefined;
    calculated.locationRoll = undefined;
    calculated.criticalModifiers = (calculated.criticalModifiers || []).filter(modifier => modifier.group !== 'resolution');
    ctx.attack!.results = undefined;
    ctx.attack!.status = 'pending_attack_roll';
  }

  private getSourceAttack(action: Action, sourceActor: ActorRound, attackName: string): ActorRoundAttack {
    const attack = sourceAttackOf(action, sourceActor, attackName);
    if (!attack) {
      throw new ValidationError(`Attack ${attackName} not found on actor ${sourceActor.actorId}`);
    }
    return attack;
  }

  /**
   * The fumble range computed when preparing (with the target's Foiler); the weapon's for older actions. It is
   * checked against the unmodified die (Fumbling, ch. 9), not the open-ended total.
   */
  private isFumble(ctx: CombatContext): boolean {
    // Workspace spec 079, decision A6 (§9.7 Firing into Melee): the second attack of a stray shot ignores fumbles.
    if (ctx.action.strayShot) {
      return false;
    }
    const fumble = ctx.attack?.calculated?.fumble ?? (ctx.sourceAttack!.fumble || 0);
    return fumble > 0 && (ctx.unmodifiedRoll ?? ctx.attackRoll!) <= fumble;
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
