import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import type { ActorRoundRepository } from '../../ports/actor-round.repository';
import { DeclareDefenseModeCommand } from '../commands/declare-defense-mode.command';

@CommandHandler(DeclareDefenseModeCommand)
export class DeclareDefenseModeHandler implements ICommandHandler<DeclareDefenseModeCommand, ActorRound> {
  private readonly logger = new Logger(DeclareDefenseModeHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: DeclareDefenseModeCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) throw new NotFoundError('Actor round', command.actorRoundId);

    actorRound.setDefenseMode(command.dodge, command.block);
    return await this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
