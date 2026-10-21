import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { DeclareInitiativeCommand } from '../commands/declare-initiative.command';

@CommandHandler(DeclareInitiativeCommand)
export class DeclareInitiativeCommandHandler implements ICommandHandler<DeclareInitiativeCommand, ActorRound> {
  private readonly logger = new Logger(DeclareInitiativeCommandHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly characterRoundRepository: ActorRoundRepository,
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DeclareInitiativeCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    if (!command.initiativeRoll || command.initiativeRoll < 2 || command.initiativeRoll > 20) {
      throw new ValidationError('Invalid initiative roll. It must be between 2 and 20');
    }
    const characterRound = await this.characterRoundRepository.findById(command.actorRoundId);
    if (!characterRound) {
      throw new NotFoundError('Character round', command.actorRoundId);
    }
    (await this.gameRepository.findById(characterRound.gameId))?.checkNotFinished();
    characterRound.declareInitiative(command.initiativeRoll, command.strikeReflex);
    const updatedCharacterRound = await this.characterRoundRepository.update(command.actorRoundId, characterRound);
    return updatedCharacterRound;
  }
}
