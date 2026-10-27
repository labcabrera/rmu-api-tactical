import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { loadActorRoundOfInjury } from '../../../../actor-rounds/application/cqrs/handlers/update-injury.handler.js';
import {
  type ActorRoundRepository,
  ACTOR_ROUND_REPOSITORY,
} from '../../../../actor-rounds/application/ports/actor-round-repository.port.js';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.js';
import type { Injury } from '../../../../actor-rounds/domain/value-objects/injury.vo.js';
import type { PoisonExposure } from '../../../../actor-rounds/domain/value-objects/poison.vo.js';
import { type PsychologyTablesPort, PSYCHOLOGY_TABLES_PORT } from '../../../../psychology/application/ports/psychology-tables.port.js';
import { openEndedRoll } from '../../../../psychology/domain/services/open-ended-roll.js';
import { ResistanceRollCalculator, type ResistanceRollResult } from '../../../../psychology/domain/services/resistance-roll.calculator.js';
import { ValidationError } from '../../../../shared/domain/errors/errors.js';
import { type PoisonTablesPort, POISON_TABLES_PORT } from '../../ports/poison-tables.port.js';
import {
  CreatePoisoningCommand,
  DismissPoisoningCommand,
  GiveAntidoteCommand,
  ResolvePoisoningCommand,
} from '../commands/poisoning.commands.js';

export interface CreatePoisoningResult {
  actorRound: ActorRound;
  exposure: PoisonExposure;
}

export interface ResolvePoisoningResult {
  actorRound: ActorRound;
  bonus: number;
  attackLevel: number;
  result: ResistanceRollResult;
  /** The poisoning, when the RR failed (irritants make none). */
  injury?: Injury;
}

export interface GiveAntidoteResult {
  actorRound: ActorRound;
  injury: Injury;
  neutralized: boolean;
}

/** A poison reaches the actor (workspace spec 042, decision 9): it waits for its RR. */
@CommandHandler(CreatePoisoningCommand)
export class CreatePoisoningHandler implements ICommandHandler<CreatePoisoningCommand, CreatePoisoningResult> {
  private readonly logger = new Logger(CreatePoisoningHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: CreatePoisoningCommand): Promise<CreatePoisoningResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    const exposure = actorRound.exposeToPoison(command.poison);
    return { actorRound: await this.actorRoundRepository.update(actorRound), exposure };
  }
}

/**
 * The poison RR of an exposure (decision 8): physical, with the actor's `poison` bonus (or the game master's), the
 * roll (rolled here when missing) and the modifiers against the poison level. A failure becomes a poisoning with the
 * stages of core's poison table.
 */
@CommandHandler(ResolvePoisoningCommand)
export class ResolvePoisoningHandler implements ICommandHandler<ResolvePoisoningCommand, ResolvePoisoningResult> {
  private readonly logger = new Logger(ResolvePoisoningHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(PSYCHOLOGY_TABLES_PORT) private readonly psychologyTables: PsychologyTablesPort,
    @Inject(POISON_TABLES_PORT) private readonly poisonTables: PoisonTablesPort,
  ) {}

  async execute(command: ResolvePoisoningCommand): Promise<ResolvePoisoningResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    const exposure = actorRound.findPoisonExposure(command.exposureId);
    const bonus = command.bonus ?? actorRound.resistanceBonus('poison');
    if (bonus === undefined) {
      throw new ValidationError(`${actorRound.actorName} has no poison RR bonus: send one`, 'err-resistance-bonus-required');
    }
    const attackLevel = exposure.poison.level;
    const result = ResistanceRollCalculator.resolve(
      { kind: 'poison', roll: command.roll ?? openEndedRoll().roll, bonus, attackLevel, modifiers: command.modifiers },
      await this.psychologyTables.find(),
    );
    const needsTable = !result.resisted && exposure.poison.category !== 'irritant';
    const rows = needsTable ? (await this.poisonTables.find()).rows : [];
    const injury = actorRound.resolvePoisonExposure(command.exposureId, { ...result, bonus }, rows);
    const updated = await this.actorRoundRepository.update(actorRound);
    return { actorRound: updated, bonus, attackLevel, result, injury };
  }
}

@CommandHandler(DismissPoisoningCommand)
export class DismissPoisoningHandler implements ICommandHandler<DismissPoisoningCommand, ActorRound> {
  private readonly logger = new Logger(DismissPoisoningHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DismissPoisoningCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.dismissPoisonExposure(command.exposureId);
    return this.actorRoundRepository.update(actorRound);
  }
}

/** An antidote for a poisoning (decision 10). Tactical does not spend the dose: strategic does when it is its item. */
@CommandHandler(GiveAntidoteCommand)
export class GiveAntidoteHandler implements ICommandHandler<GiveAntidoteCommand, GiveAntidoteResult> {
  private readonly logger = new Logger(GiveAntidoteHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: GiveAntidoteCommand): Promise<GiveAntidoteResult> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    const { injury, neutralized } = actorRound.giveAntidote(command.injuryId, command.antidote);
    const updated = await this.actorRoundRepository.update(actorRound);
    return { actorRound: updated, injury: updated.findInjury(injury.id), neutralized };
  }
}
