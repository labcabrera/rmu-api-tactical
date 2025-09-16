import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UnprocessableEntityError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { AddFatigueCommand } from '../commands/add-fatigue.command';

@CommandHandler(AddFatigueCommand)
export class AddFatigueHandler implements ICommandHandler<AddFatigueCommand, ActorRound> {
  private readonly logger = new Logger(AddFatigueHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: AddFatigueCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(command.actorId, command.round);
    if (!actorRound) {
      throw new UnprocessableEntityError(`Actor round not found for actor ${command.actorId} and round ${command.round}`);
    }
    actorRound.fatigue.accumulator += command.fatigue;
    //TODO check create endurance alert
    const updated = await this.actorRoundRepository.update(actorRound.id, actorRound);
    //TODO notify event bus
    return updated;
  }
}
