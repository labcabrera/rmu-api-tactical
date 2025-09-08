import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { ActorRoundService } from '../../../../actor-rounds/application/services/actor-round-service';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { StartRoundCommand } from '../commands/start-round.command';

@CommandHandler(StartRoundCommand)
export class StartRoundHandler implements ICommandHandler<StartRoundCommand, Game> {
  private readonly logger = new Logger(StartRoundHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameEventBus: GameEventBusPort,
    @Inject() private readonly actorRoundService: ActorRoundService,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    game.startRound();
    const updatedGame = await this.gameRepository.update(gameId, game);
    await this.createCharacterRounds(updatedGame);
    const events = game.pullDomainEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return updatedGame;
  }

  private async createCharacterRounds(game: Game): Promise<void> {
    await Promise.all(game.actors.map((actor) => this.actorRoundService.create(game.id, actor, game.round)));
  }
}
