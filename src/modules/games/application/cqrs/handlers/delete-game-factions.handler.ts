import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { Game } from '../../../domain/aggregates/game';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { DeleteGameFactionsCommand } from '../commands/delete-game-factions.command';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(DeleteGameFactionsCommand)
export class DeleteGameFactionsHandler implements ICommandHandler<DeleteGameFactionsCommand, Game> {
  private readonly logger = new Logger(DeleteGameFactionsHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: DeleteGameFactionsCommand): Promise<Game> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    game.deleteFactions(command.factions);
    const updated = await this.gameRepository.update(command.gameId, game);
    const events = game.getUncommittedEvents();
    void this.eventPublisher.publish('game', ...events);
    return updated;
  }
}
