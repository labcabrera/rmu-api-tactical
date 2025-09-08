import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { DeleteGameCommand } from '../commands/delete-game.command';
import { DeleteGamesByStrategicIdCommand } from '../commands/delete-games-by-strategic-id.command';

@CommandHandler(DeleteGamesByStrategicIdCommand)
export class DeleteGamesByStrategicIdHandler implements ICommandHandler<DeleteGamesByStrategicIdCommand> {
  private readonly logger = new Logger(DeleteGamesByStrategicIdHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('GameEventProducer') private readonly gameEventBus: GameEventBusPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: DeleteGamesByStrategicIdCommand): Promise<void> {
    this.logger.log(`Deleting games for strategic game id ${command.strategicGameId}`);
    const games = await this.gameRepository.findByStrategicId(command.strategicGameId);
    if (games.length === 0) {
      this.logger.log(`No games found for strategic game id ${command.strategicGameId}`);
      return;
    }
    await Promise.all(games.map((game) => this.commandBus.execute(new DeleteGameCommand(game.id, command.userId, command.roles))));
    //TODO notify?
  }
}
