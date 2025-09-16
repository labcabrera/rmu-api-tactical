import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, IQueryHandler } from '@nestjs/cqrs';
import { UnprocessableEntityError } from '../../../../shared/domain/errors';
import type { ActorRoundRepository } from '../../ports/out/character-round.repository';
import { SubstractBoCommand } from '../commands/substract-bo.command';

@CommandHandler(SubstractBoCommand)
export class SubstractBoHandler implements IQueryHandler<SubstractBoCommand> {
  private readonly logger = new Logger(SubstractBoHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository) {}

  async execute(command: SubstractBoCommand): Promise<void> {
    this.logger.debug('Substracting bo from actor round: ', command);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new UnprocessableEntityError(`Actor round not found: ${command.actorRoundId}`);
    }
    actorRound.substractBo(command.attackName, command.bo);
    await this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
