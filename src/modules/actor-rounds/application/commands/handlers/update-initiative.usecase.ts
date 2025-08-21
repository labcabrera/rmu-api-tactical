import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Inject, NotImplementedException } from '@nestjs/common';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/entities/actor-round.entity';
import * as characterRoundRepository from '../../ports/out/character-round.repository';
import { UpdateInitiativeCommand } from '../update-initiative.command';

@CommandHandler(UpdateInitiativeCommand)
export class UpdateInitiativeUseCase implements ICommandHandler<UpdateInitiativeCommand, ActorRound> {
  constructor(@Inject('ActorRoundRepository') private readonly characterRoundRepository: characterRoundRepository.ActorRoundRepository) {}

  async execute(command: UpdateInitiativeCommand): Promise<ActorRound> {
    const characterRound = await this.characterRoundRepository.findById(command.characterRoundId);
    if (!characterRound) {
      throw new NotFoundError('Character round', command.characterRoundId);
    }
    const baseInitiative = characterRound.initiative?.base || 0;
    const penalty = characterRound.initiative?.penalty || 0;
    const total = baseInitiative + penalty + command.initiativeRoll;
    const updatedCharacterRound = await this.characterRoundRepository.update(command.characterRoundId, {
      initiative: {
        base: baseInitiative,
        penalty: penalty,
        roll: command.initiativeRoll,
        total: total,
      },
    });
    return this.mapToCharacterRoundInitiative(updatedCharacterRound);
  }

  private mapToCharacterRoundInitiative(characterRound: any): ActorRound {
    throw new NotImplementedException();
    // return {
    //   id: characterRound.id,
    //   gameId: characterRound.gameId,
    //   characterId: characterRound.characterId,
    //   round: characterRound.round,
    //   initiative: {
    //     base: characterRound.initiative?.base || 0,
    //     penalty: characterRound.initiative?.penalty || 0,
    //     roll: characterRound.initiative?.roll || 0,
    //     total: characterRound.initiative?.total || 0,
    //   },
    //   actionPoints: characterRound.actionPoints || 0,
    //   createdAt: characterRound.createdAt,
    //   updatedAt: characterRound.updatedAt,
    // };
  }
}
