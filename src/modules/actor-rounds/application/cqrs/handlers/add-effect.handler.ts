import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/entities/actor-round.aggregate';
import { ActorRoundEffectService } from '../../../domain/services/actor-round-effect.service';
import * as arr from '../../ports/out/character-round.repository';
import { AddEffectCommand } from '../commands/add-effect.command';

@CommandHandler(AddEffectCommand)
export class AddEffectHandler implements ICommandHandler<AddEffectCommand, ActorRound> {
  private readonly logger = new Logger(AddEffectHandler.name);

  constructor(
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: arr.ActorRoundRepository,
    @Inject() private readonly actorRoundEffectService: ActorRoundEffectService,
  ) {}

  async execute(command: AddEffectCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    this.actorRoundEffectService.addEffect(actorRound, command.effect);
    return await this.actorRoundRepository.update(actorRound.id, actorRound);
  }
}
