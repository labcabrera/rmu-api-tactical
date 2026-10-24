import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { DeleteGameCommand } from '../commands/delete-game.command';
import { DeleteGamesByStrategicIdCommand } from '../commands/delete-games-by-strategic-id.command';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(DeleteGamesByStrategicIdCommand)
export class DeleteGamesByStrategicIdHandler implements ICommandHandler<DeleteGamesByStrategicIdCommand> {
  private readonly logger = new Logger(DeleteGamesByStrategicIdHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: DeleteGamesByStrategicIdCommand): Promise<void> {
    this.logger.log(`Deleting games for strategic game id ${command.strategicGameId}`);
    const games = await this.gameRepository.findByStrategicId(command.strategicGameId);
    if (games.length === 0) {
      this.logger.log(`No games found for strategic game id ${command.strategicGameId}`);
      return;
    }
    await Promise.all(games.map(game => this.commandBus.execute(new DeleteGameCommand(game.id, command.userId, command.roles))));
    //TODO notify?
  }
}
