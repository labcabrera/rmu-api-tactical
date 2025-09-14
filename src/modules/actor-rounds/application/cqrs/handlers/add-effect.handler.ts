import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { AddEffectCommand } from '../commands/add-effect.command';

@CommandHandler(AddEffectCommand)
export class AddEffectHandler implements ICommandHandler<AddEffectCommand, ActorRound> {
  private readonly logger = new Logger(AddEffectHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: AddEffectCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    actorRound.addEffect(command.effect);
    return await this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
