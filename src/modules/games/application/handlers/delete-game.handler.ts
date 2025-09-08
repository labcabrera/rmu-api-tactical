import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import * as ar from '../../../actions/application/ports/out/action.repository';
import * as arr from '../../../actor-rounds/application/ports/out/character-round.repository';
import { NotFoundError } from '../../../shared/domain/errors';
import { DeleteGameCommand } from '../cqrs/commands/delete-game.command';
import * as gameEventProducer from '../ports/game-event-bus.port';
import * as gr from '../ports/game.repository';

@CommandHandler(DeleteGameCommand)
export class DeleteGameCommandHandler implements ICommandHandler<DeleteGameCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gameEventProducer.GameEventBusPort,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: arr.ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ar.ActionRepository,
  ) {}

  async execute(command: DeleteGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    await this.actionRepository.deleteByGameId(command.gameId);
    await this.actorRoundRepository.deleteByGameId(command.gameId);
    await this.gameRepository.deleteById(command.gameId);
    await this.gameEventProducer.deleted(game);
  }
}
