import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnprocessableEntityError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { DeclareActorParryCommand } from '../commands/declare-actor-parry.command';

@CommandHandler(DeclareActorParryCommand)
export class DeclareActorParryHandler implements ICommandHandler<DeclareActorParryCommand, ActorRound> {
  private readonly logger = new Logger(DeclareActorParryHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: DeclareActorParryCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(command.actorId, command.round);
    if (!actorRound) {
      throw new UnprocessableEntityError(`Unable to find actor round for actor ${command.actorId} and round ${command.round}`);
    }
    actorRound.declareParry(command.parry);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
