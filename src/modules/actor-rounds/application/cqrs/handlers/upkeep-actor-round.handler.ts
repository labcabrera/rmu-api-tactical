import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { UpkeepActorRoundCommand } from '../commands/upkeep-actor-round.command';

@CommandHandler(UpkeepActorRoundCommand)
export class UpkeepActorRoundHandler implements ICommandHandler<UpkeepActorRoundCommand, ActorRound> {
  private readonly logger = new Logger(UpkeepActorRoundHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: UpkeepActorRoundCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(command.actorRoundId, command.round);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    actorRound.applyUpkeep();
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
