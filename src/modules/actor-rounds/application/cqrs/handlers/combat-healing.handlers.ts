import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { DeleteTemporaryModifierCommand, DropItemsCommand, LoosenTourniquetCommand } from '../commands/combat-healing.commands.js';
import { loadActorRoundOfInjury } from './update-injury.handler.js';

/** The tourniquet of an injury is loosened (workspace spec 068, decision 5): it bleeds this round, tight from the next. */
@CommandHandler(LoosenTourniquetCommand)
export class LoosenTourniquetHandler implements ICommandHandler<LoosenTourniquetCommand, ActorRound> {
  private readonly logger = new Logger(LoosenTourniquetHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: LoosenTourniquetCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    const phase = game && game.round === actorRound.round ? game.getEffectPhase() : undefined;
    actorRound.loosenTourniquet(command.injuryId, phase);
    return this.actorRoundRepository.update(actorRound);
  }
}

/** A broken actor drops what it holds (workspace spec 068, decision 14): it stays in its inventory. */
@CommandHandler(DropItemsCommand)
export class DropItemsHandler implements ICommandHandler<DropItemsCommand, ActorRound> {
  private readonly logger = new Logger(DropItemsHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DropItemsCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.dropHeldItems();
    return this.actorRoundRepository.update(actorRound);
  }
}

/** The game master removes a temporary modifier (workspace spec 068, decision 19). */
@CommandHandler(DeleteTemporaryModifierCommand)
export class DeleteTemporaryModifierHandler implements ICommandHandler<DeleteTemporaryModifierCommand, ActorRound> {
  private readonly logger = new Logger(DeleteTemporaryModifierHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DeleteTemporaryModifierCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.removeTemporaryModifier(command.modifierId);
    return this.actorRoundRepository.update(actorRound);
  }
}
