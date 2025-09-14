import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Inject, Logger } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { ActorRound } from '../../../domain/aggregates/actor-round.aggregate';
import { ActorRoundEffect } from '../../../domain/value-objets/actor-round-effect.vo';
import * as arr from '../../ports/out/character-round.repository';
import { AddHpCommand } from '../commands/add-hp.command';

@CommandHandler(AddHpCommand)
export class AddHpHandler implements ICommandHandler<AddHpCommand, ActorRound> {
  private readonly logger = new Logger(AddHpHandler.name);

  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: arr.ActorRoundRepository) {}

  async execute(command: AddHpCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    if (!command.hp || command.hp == 0) {
      throw new ValidationError('Invalid HP value.');
    }
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    actorRound.hp.current += command.hp;
    this.checkDeath(actorRound);
    return await this.actorRoundRepository.update(actorRound.id, actorRound);
  }

  private checkDeath(actorRound: ActorRound): void {
    if (actorRound.hp.current <= 0) {
      const existing = actorRound.effects.find((e) => e.status === 'death');
      if (existing) {
        return;
      }
      const status = { status: 'death', value: undefined, rounds: undefined } as ActorRoundEffect;
      actorRound.effects.push(status);
    }
  }
}
