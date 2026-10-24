import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type IQueryHandler } from '@nestjs/cqrs';
import { UnprocessableEntityError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { SubstractBoCommand } from '../commands/substract-bo.command.js';

@CommandHandler(SubstractBoCommand)
export class SubstractBoHandler implements IQueryHandler<SubstractBoCommand> {
  private readonly logger = new Logger(SubstractBoHandler.name);

  constructor(@Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: SubstractBoCommand): Promise<ActorRound> {
    this.logger.debug(`Substracting bo << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new UnprocessableEntityError(`Actor round not found: ${command.actorRoundId}`);
    }
    actorRound.addUsedBo(command.attackName, command.bo);
    const updated = await this.actorRoundRepository.update(actorRound);
    //TODO propagate events
    return updated;
  }
}
