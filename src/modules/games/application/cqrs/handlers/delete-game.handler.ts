import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActionRepository } from '../../../../actions/application/ports/action.repository';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { NotFoundError } from '../../../../shared/domain/errors';
import { GameDeletedEvent } from '../../../domain/events/game.events';
import type { GameEventBusPort } from '../../ports/game-event-bus.port';
import type { GameRepository } from '../../ports/game.repository';
import { DeleteGameCommand } from '../commands/delete-game.command';

@CommandHandler(DeleteGameCommand)
export class DeleteGameHandler implements ICommandHandler<DeleteGameCommand> {
  private readonly logger = new Logger(DeleteGameHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('GameEventBus') private readonly gameEventBus: GameEventBusPort,
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
    this.gameEventBus.publish(new GameDeletedEvent(game));
  }
}
