import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Inject } from '@nestjs/common';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { ActorRound, ActorRoundEffect } from '../../../domain/entities/actor-round.entity';
import * as arr from '../../ports/out/character-round.repository';
import { AddHpCommand } from '../add-hp.command';

@CommandHandler(AddHpCommand)
export class AddHpCommandHandler implements ICommandHandler<AddHpCommand, ActorRound> {
  constructor(@Inject('ActorRoundRepository') private readonly actorRoundRepository: arr.ActorRoundRepository) {}

  async execute(command: AddHpCommand): Promise<ActorRound> {
    if (!command.hp || command.hp == 0) {
      throw new ValidationError('Invalid HP value.');
    }
    const actorRound = await this.actorRoundRepository.findById(command.actorRoundId);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    actorRound.hp.current += command.hp;
    return await this.actorRoundRepository.save(actorRound);
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
