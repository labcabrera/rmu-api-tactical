import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler, type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { isUpstreamHttpError } from '../../../../shared/infrastructure/http/http-client.js';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port.js';
import { Action } from '../../../domain/aggregates/action.js';
import { ActionUpdatedEvent } from '../../../domain/events/action.events.js';
import {
  failurePowerPoints,
  failureRollModifier,
  scrResult,
  spellAllowsRr,
  spellResistanceRoll,
} from '../../../domain/services/spell-casting.rules.js';
import type { ActionSpellTarget, SpellRealm } from '../../../domain/value-objects/action-spell.vo.js';
import type { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo.js';
import { type ActionRepository, ACTION_REPOSITORY } from '../../ports/action-repository.port.js';
import { type SpellcastingTablesPort, SPELLCASTING_TABLES_PORT } from '../../ports/spellcasting-tables.port.js';
import { type SpellActionContext, SpellCastingService } from '../../services/spell/spell-casting.service.js';
import {
  ApplySpellCommand,
  PreviewSpellQuery,
  ResolveSpellResistanceCommand,
  RollSpellCommand,
  RollSpellFailureCommand,
} from '../commands/spell.commands.js';

const checkRoll = (roll: unknown): void => {
  if (typeof roll !== 'number' || !Number.isFinite(roll)) {
    throw new ValidationError('Required roll value', 'err-roll-required');
  }
};

const checkStatus = (context: SpellActionContext, status: Action['status'], step: string): void => {
  if (context.action.status !== status) {
    throw new ValidationError(`The cast is ${context.action.status}: it cannot take the ${step} now`, 'err-spell-invalid-step');
  }
};

/** Saves the action and publishes its update, with its AP state for the response. */
async function saveAction(repository: ActionRepository, publisher: DomainEventPublisher, context: SpellActionContext): Promise<Action> {
  const updated = await repository.update(context.action);
  await publisher.publish('action', new ActionUpdatedEvent(updated));
  updated.refreshApState(context.actorRound, context.currentPhase);
  return updated;
}

/**
 * The Spellcasting Roll (Spell Law 4.2): it needs the minimum AP, as preparing an attack. A success or a 0 waits to be
 * applied; a negative SCR waits for the spell failure roll.
 */
@CommandHandler(RollSpellCommand)
export class RollSpellHandler implements ICommandHandler<RollSpellCommand, Action> {
  private readonly logger = new Logger(RollSpellHandler.name);

  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly spellCasting: SpellCastingService,
  ) {}

  async execute(command: RollSpellCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    checkRoll(command.roll);
    const context = await this.spellCasting.load(command.actionId);
    checkStatus(context, 'declared', 'Spellcasting Roll');
    context.action.checkResolvable(context.actorRound, context.currentPhase);
    const calculation = await this.spellCasting.calculate(context, command.options);
    this.spellCasting.checkPreparation(context.spell, calculation.options);
    const total = command.roll + calculation.bonus;
    const result = scrResult(total);
    context.spell.options = calculation.options;
    context.spell.roll = { modifiers: calculation.modifiers, roll: command.roll, totalRoll: total };
    context.spell.result = result;
    context.spell.failure = undefined;
    context.spell.targets = undefined;
    context.action.actionPoints = context.action.apOf(context.actorRound, context.currentPhase);
    context.action.status = result === 'failure' ? 'pending_roll' : 'pending_apply';
    context.action.updatedAt = new Date();
    return saveAction(this.actionRepository, this.eventPublisher, context);
  }
}

/** The spell failure roll (Spell Law 4.4): open-ended, plus the negative SCR modifiers, on the realm's table. */
@CommandHandler(RollSpellFailureCommand)
export class RollSpellFailureHandler implements ICommandHandler<RollSpellFailureCommand, Action> {
  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    @Inject(SPELLCASTING_TABLES_PORT) private readonly tables: SpellcastingTablesPort,
    private readonly spellCasting: SpellCastingService,
  ) {}

  async execute(command: RollSpellFailureCommand): Promise<Action> {
    checkRoll(command.roll);
    const context = await this.spellCasting.load(command.actionId);
    checkStatus(context, 'pending_roll', 'spell failure roll');
    const spell = context.spell;
    const realm: SpellRealm = command.realm ?? spell.spell.listRealms[0];
    if (!spell.spell.listRealms.includes(realm)) {
      throw new ValidationError(`The list of ${spell.spell.name} is not of the ${realm} realm`, 'err-spell-invalid-realm');
    }
    const modifier = failureRollModifier(spell.roll?.modifiers ?? []);
    const total = command.roll + modifier;
    const lookup = await this.tables.findFailure(realm, spell.spell.type, total);
    spell.failure = { realm, roll: command.roll, modifier, total, text: lookup.text, suggestedPp: lookup.pp };
    context.action.status = 'pending_apply';
    context.action.updatedAt = new Date();
    return saveAction(this.actionRepository, this.eventPublisher, context);
  }
}

/** The resistance rolls of the targets of a successful cast (Spell Law 4.5): sent again, they replace the earlier ones. */
@CommandHandler(ResolveSpellResistanceCommand)
export class ResolveSpellResistanceHandler implements ICommandHandler<ResolveSpellResistanceCommand, Action> {
  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly spellCasting: SpellCastingService,
  ) {}

  async execute(command: ResolveSpellResistanceCommand): Promise<Action> {
    const context = await this.spellCasting.load(command.actionId);
    checkStatus(context, 'pending_apply', 'resistance rolls');
    const spell = context.spell;
    if (spell.result !== 'success') {
      throw new ValidationError('Only a successful cast takes resistance rolls', 'err-spell-invalid-step');
    }
    if (!spellAllowsRr(spell.spell)) {
      throw new ValidationError(`${spell.spell.name} allows no resistance roll`, 'err-spell-no-resistance');
    }
    const scr = spell.roll?.totalRoll ?? 0;
    const targets: ActionSpellTarget[] = [];
    for (const request of command.targets) {
      const target = await this.actorRoundRepository.findByActorIdAndRound(context.action.gameId, request.actorId, context.action.round);
      if (!target) {
        throw new ValidationError(`Actor ${request.actorId} is not in round ${context.action.round}`, 'err-spell-invalid-target');
      }
      const conditions = request.conditions ?? {};
      // Utility spells affect a willing target without a roll (Spell Law 4.5).
      if (spell.spell.resistance?.kind === 'willing' && conditions.willing) {
        targets.push({
          actorId: target.actorId,
          actorName: target.actorName,
          rolled: false,
          roll: null,
          conditions,
          breakdown: [],
          total: null,
          required: scr,
          resisted: false,
          failure: 0,
        });
        continue;
      }
      checkRoll(request.roll);
      const bonuses: Partial<Record<SpellRealm, number>> = {};
      spell.spell.listRealms.forEach(realm => (bonuses[realm] = target.resistanceBonus(realm) ?? request.bonus ?? 0));
      const rr = spellResistanceRoll({
        roll: request.roll!,
        bonuses,
        listRealms: spell.spell.listRealms,
        casterLevel: spell.caster.level,
        spellModifier: spell.spell.resistance?.modifier ?? 0,
        conditions,
        scr,
      });
      targets.push({
        actorId: target.actorId,
        actorName: target.actorName,
        rolled: true,
        roll: request.roll!,
        conditions,
        breakdown: rr.breakdown,
        total: rr.total,
        required: scr,
        resisted: rr.resisted,
        failure: rr.failure,
      });
    }
    spell.targets = targets;
    context.action.updatedAt = new Date();
    return saveAction(this.actionRepository, this.eventPublisher, context);
  }
}

/**
 * Applies the cast (decision 10): spends the power points in strategic (the spell's, or what the spell failure result
 * takes, as the game master confirms) and completes the action. A cast never applied spends nothing.
 */
@CommandHandler(ApplySpellCommand)
export class ApplySpellHandler implements ICommandHandler<ApplySpellCommand, Action> {
  constructor(
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly spellCasting: SpellCastingService,
  ) {}

  async execute(command: ApplySpellCommand): Promise<Action> {
    const context = await this.spellCasting.load(command.actionId);
    // Once its attack is prepared, an attack spell is applied with its attack (spec 030, phase 4).
    if ((context.action.attacks?.length ?? 0) > 0) {
      throw new ValidationError('The attack of the spell is applied with the attack', 'err-spell-attack-pending');
    }
    checkStatus(context, 'pending_apply', 'apply');
    const spell = context.spell;
    const spellcasting = await this.spellCasting.readSpellcasting(context.actorRound);
    const current = spellcasting.power?.current ?? 0;
    const suggested =
      spell.result === 'failure' && spell.failure
        ? failurePowerPoints(spell.failure.suggestedPp, spell.spell.powerPoints, current)
        : spell.spell.powerPoints;
    const amount = command.powerPoints ?? suggested;
    if (!Number.isInteger(amount) || amount < 0) {
      throw new ValidationError('Power points to spend must be a whole number from 0', 'err-spell-invalid-power');
    }
    if (amount > current) {
      throw new ValidationError(`The caster has ${current} power points, not ${amount}`, 'err-insufficient-power');
    }
    if (amount > 0) {
      try {
        await this.spellCasting.spendPower(context.actorRound, amount);
      } catch (err) {
        if (isUpstreamHttpError(err) && err.status === 400) {
          throw new ValidationError(`Strategic refused to spend ${amount} power points: ${err.message}`, 'err-insufficient-power');
        }
        throw err;
      }
    }
    spell.powerPointsSpent = amount;
    context.action.close(context.actorRound, context.currentPhase, 'completed');
    return saveAction(this.actionRepository, this.eventPublisher, context);
  }
}

export interface SpellPreview {
  modifiers: KeyValueModifier[];
  bonus: number;
  /** The SCR needs a preparation round with these choices (an overcast spell). */
  needsPreparation: boolean;
  actionPoints: number;
}

/** The SCR modifiers of a declared cast with some choices, for the resolution dialog (nothing stored). */
@QueryHandler(PreviewSpellQuery)
export class PreviewSpellHandler implements IQueryHandler<PreviewSpellQuery, SpellPreview> {
  constructor(private readonly spellCasting: SpellCastingService) {}

  async execute(query: PreviewSpellQuery): Promise<SpellPreview> {
    const context = await this.spellCasting.load(query.actionId);
    const calculation = await this.spellCasting.calculate(context, query.options);
    let needsPreparation = false;
    try {
      this.spellCasting.checkPreparation(context.spell, calculation.options);
    } catch {
      needsPreparation = true;
    }
    return {
      modifiers: calculation.modifiers,
      bonus: calculation.bonus,
      needsPreparation,
      actionPoints: context.action.apOf(context.actorRound, context.currentPhase),
    };
  }
}
