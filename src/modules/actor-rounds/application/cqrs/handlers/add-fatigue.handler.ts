import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnprocessableEntityError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { AddFatigueCommand } from '../commands/add-fatigue.command';

@CommandHandler(AddFatigueCommand)
export class AddFatigueHandler implements ICommandHandler<AddFatigueCommand, ActorRound> {
  private readonly logger = new Logger(AddFatigueHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: AddFatigueCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    let actorRound: ActorRound | null = null;
    if (command.actorRoundId) {
      actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    } else if (command.actorId && command.round !== undefined) {
      actorRound = await this.actorRoundRepository.findByActorIdAndRound(command.actorId, command.round);
    }

    if (!actorRound) throw new UnprocessableEntityError(`Actor round not found`);

    actorRound.addFatigue(command.fatigue);

    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
