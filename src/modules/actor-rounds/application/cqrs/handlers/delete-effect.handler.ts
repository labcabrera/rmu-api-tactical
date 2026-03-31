import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { DeleteEffectCommand } from '../commands/delete-effect.command';

@CommandHandler(DeleteEffectCommand)
export class DeleteEffectHandler implements ICommandHandler<DeleteEffectCommand, ActorRound> {
  private readonly logger = new Logger(DeleteEffectHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: DeleteEffectCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);

    actorRound.deleteEffect(command.effectId);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
