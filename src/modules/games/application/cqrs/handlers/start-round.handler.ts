import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { CreateActorRoundCommand } from '../../../../actor-rounds/application/cqrs/commands/create-actor-round.command';
import { NotFoundError } from '../../../../shared/domain/errors';
import { Actor } from '../../../domain/entities/actor.vo';
import { Game } from '../../../domain/entities/game.aggregate';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { StartRoundCommand } from '../commands/start-round.command';

@CommandHandler(StartRoundCommand)
export class StartRoundHandler implements ICommandHandler<StartRoundCommand, Game> {
  private readonly logger = new Logger(StartRoundHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
    private commandBus: CommandBus,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const { gameId } = command;
    const game = await this.gameRepository.findById(gameId);
    if (!game) {
      throw new NotFoundError('Game', gameId);
    }
    game.startRound();
    //TODO make saga
    const updatedGame = await this.gameRepository.update(gameId, game);
    await Promise.all(game.actors.map((actor) => this.createActorRounds(game, actor)));
    const events = game.pullDomainEvents();
    events.forEach((event) => this.gameEventBus.publish(event));
    return updatedGame;
  }

  private async createActorRounds(game: Game, actor: Actor): Promise<void> {
    const command = new CreateActorRoundCommand(game.id, actor, game.round);
    await this.commandBus.execute(command);
  }
}
