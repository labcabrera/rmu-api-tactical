import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { DeleteInjuryCommand } from '../commands/delete-injury.command.js';
import { loadActorRoundOfInjury } from './update-injury.handler.js';

@CommandHandler(DeleteInjuryCommand)
export class DeleteInjuryHandler implements ICommandHandler<DeleteInjuryCommand, ActorRound> {
  private readonly logger = new Logger(DeleteInjuryHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: DeleteInjuryCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadActorRoundOfInjury(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.deleteInjury(command.injuryId);
    return this.actorRoundRepository.update(actorRound);
  }
}
