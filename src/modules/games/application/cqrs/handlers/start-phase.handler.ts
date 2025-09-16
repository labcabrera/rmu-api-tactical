import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { StartPhaseCommand } from '../commands/start-phase.command';
import { StartRoundCommand } from '../commands/start-round.command';

@CommandHandler(StartPhaseCommand)
export class StartPhaseHandler implements ICommandHandler<StartPhaseCommand, Game> {
  private readonly logger = new Logger(StartPhaseHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    const pendingActors = (await this.actorRoundRepository.findWithUndefinedInitiativeRoll(game.id, game.round)).filter(
      (ar) => !ar.isDead(),
    );
    if (pendingActors.length > 0) {
      throw new ValidationError('There are still character rounds without initiative declared');
    }
    game.startPhase();
    const updatedGame = await this.gameRepository.update(game.id, game);
    const events = game.pullDomainEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return updatedGame;
  }
}
