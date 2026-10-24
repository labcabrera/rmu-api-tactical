import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { UpkeepActorRoundCommand } from '../commands/upkeep-actor-round.command.js';

@CommandHandler(UpkeepActorRoundCommand)
export class UpkeepActorRoundHandler implements ICommandHandler<UpkeepActorRoundCommand, ActorRound> {
  private readonly logger = new Logger(UpkeepActorRoundHandler.name);

  constructor(@Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: UpkeepActorRoundCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(command.gameId, command.actorRoundId, command.round);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    actorRound.applyUpkeep();
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
