import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/errors';
import * as gameRepository from '../../ports/out/game.repository';
import { DeleteGameCommand } from '../delete-game.command';

@CommandHandler(DeleteGameCommand)
export class DeleteGameUseCase implements ICommandHandler<DeleteGameCommand> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    // @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
  ) {}

  //TODO delete actions and character rounds
  async execute(command: DeleteGameCommand): Promise<void> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new NotFoundError('Game', command.gameId);
    }
    // await this.characterRepository.deleteByGameId(command.gameId);
    await this.gameRepository.deleteById(command.gameId);
  }
}
