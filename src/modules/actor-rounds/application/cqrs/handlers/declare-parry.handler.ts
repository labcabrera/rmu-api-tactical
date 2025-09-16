import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { DeclareParryCommand } from '../commands/declare-parry.command';

@CommandHandler(DeclareParryCommand)
export class DeclareParryHandler implements ICommandHandler<DeclareParryCommand, ActorRound> {
  private readonly logger = new Logger(DeclareParryHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: DeclareParryCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    actorRound.declareParry(command.parry);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
