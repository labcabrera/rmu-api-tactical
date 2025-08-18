import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { NotFoundError } from '../../../../shared/domain/errors';
import * as characterRepository from '../../ports/out/character.repository';
import { DeleteCharacterCommand } from '../delete-character.command';

@CommandHandler(DeleteCharacterCommand)
export class DeleteCharacterUseCase implements ICommandHandler<DeleteCharacterCommand> {
  constructor(@Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository) {}

  async execute(command: DeleteCharacterCommand): Promise<void> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new NotFoundError('Character', command.characterId);
    }
    await this.characterRepository.deleteById(command.characterId);
  }
}
