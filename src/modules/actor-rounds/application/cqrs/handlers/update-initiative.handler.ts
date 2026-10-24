import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { DeclareInitiativeCommand } from '../commands/declare-initiative.command.js';

@CommandHandler(DeclareInitiativeCommand)
export class DeclareInitiativeCommandHandler implements ICommandHandler<DeclareInitiativeCommand, ActorRound> {
  private readonly logger = new Logger(DeclareInitiativeCommandHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly characterRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
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
    const updatedCharacterRound = await this.characterRoundRepository.update(characterRound);
    return updatedCharacterRound;
  }
}
