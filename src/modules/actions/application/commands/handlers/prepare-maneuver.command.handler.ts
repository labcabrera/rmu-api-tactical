import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as crr from '../../../../character-rounds/application/ports/out/character-round.repository';
import * as cr from '../../../../characters/application/ports/out/character.repository';
import * as gr from '../../../../games/application/ports/out/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/entities/action.entity';
import * as aep from '../../ports/out/action-event-producer';
import * as ar from '../../ports/out/action.repository';
import * as ac from '../../ports/out/attack-client';
import { PrepareManeuverCommand } from '../prepare-maneuver.command';

@CommandHandler(PrepareManeuverCommand)
export class PrepareManeuverCommandHandler implements ICommandHandler<PrepareManeuverCommand, Action> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
    @Inject('CharacterRoundRepository') private readonly characterRoundRepository: crr.CharacterRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ar.ActionRepository,
    @Inject('AttackClient') private readonly attackClient: ac.AttackClient,
    @Inject('ActionEventProducer') private readonly actionEventProducer: aep.ActionEventProducer,
  ) {}

  async execute(command: PrepareManeuverCommand): Promise<Action> {
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    if (action.actionType !== 'maneuver') {
      throw new ValidationError('Action is not a maneuver');
    }
    if (action.status !== 'declared') {
      throw new ValidationError('Action is not in a preparable state');
    }
    if (!action.maneuver) {
      throw new ValidationError('Required maneuver data is missing');
    }
    action.status = 'in_progress';
    action.maneuver.difficulty = command.difficulty;
    const updated = await this.actionRepository.save(action);
    await this.actionEventProducer.updated(updated);
    return updated;
  }
}
