import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { type ActionRepository, ACTION_REPOSITORY } from '../../../../actions/application/ports/action-repository.port';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../../../actor-rounds/application/ports/actor-round-repository.port';
import { NotFoundError } from '../../../../shared/domain/errors/errors';
import { GameDeletedEvent } from '../../../domain/events/game.events';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port';
import { DeleteGameCommand } from '../commands/delete-game.command';
import { DOMAIN_EVENT_PUBLISHER, type DomainEventPublisher } from '../../../../shared/application/ports/domain-event-publisher.port';

@CommandHandler(DeleteGameCommand)
export class DeleteGameHandler implements ICommandHandler<DeleteGameCommand> {
  private readonly logger = new Logger(DeleteGameHandler.name);

  constructor(
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(ACTION_REPOSITORY) private readonly actionRepository: ActionRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER) private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(command: DeleteGameCommand): Promise<void> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    await this.actionRepository.deleteByGameId(command.gameId);
    await this.actorRoundRepository.deleteByGameId(command.gameId);
    await this.gameRepository.deleteById(command.gameId);
    void this.eventPublisher.publish('game', new GameDeletedEvent(game));
  }
}
