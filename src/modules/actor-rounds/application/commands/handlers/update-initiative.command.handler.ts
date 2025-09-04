import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Inject } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/entities/actor-round.entity';
import * as arr from '../../ports/out/character-round.repository';
import { DeclareInitiativeCommand } from '../declare-initiative.command';

@CommandHandler(DeclareInitiativeCommand)
export class DeclareInitiativeCommandHandler implements ICommandHandler<DeclareInitiativeCommand, ActorRound> {
  constructor(@Inject('ActorRoundRepository') private readonly characterRoundRepository: arr.ActorRoundRepository) {}

  async execute(command: DeclareInitiativeCommand): Promise<ActorRound> {
    if (!command.initiativeRoll || command.initiativeRoll < 2 || command.initiativeRoll > 20) {
      throw new ValidationError('Invalid initiative roll. It must be between 2 and 20');
    }
    const characterRound = await this.characterRoundRepository.findById(command.actorRoundId);
    if (!characterRound) {
      throw new NotFoundError('Character round', command.actorRoundId);
    }
    const baseInitiative = characterRound.initiative?.base || 0;
    const penalty = characterRound.initiative?.penalty || 0;
    const total = baseInitiative + penalty + command.initiativeRoll;

    characterRound.initiative.roll = command.initiativeRoll;
    characterRound.initiative.total = total;

    const updatedCharacterRound = await this.characterRoundRepository.update(command.actorRoundId, characterRound);
    return updatedCharacterRound;
  }
}
