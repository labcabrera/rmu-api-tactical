import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { AddEffectsCommand } from '../commands/add-effects.command';

@CommandHandler(AddEffectsCommand)
export class AddEffectsHandler implements ICommandHandler<AddEffectsCommand, ActorRound> {
  private readonly logger = new Logger(AddEffectsHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: AddEffectsCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    actorRound.applyAttackResults(command.dmg, command.effects);
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
