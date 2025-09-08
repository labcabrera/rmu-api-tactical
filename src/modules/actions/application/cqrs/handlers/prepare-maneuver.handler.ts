import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Action } from '../../../domain/entities/action.aggregate';
import type { ActionEventProducer } from '../../ports/out/action-event-producer';
import type { ActionRepository } from '../../ports/out/action.repository';
import type { AttackClient } from '../../ports/out/attack-client';
import { PrepareManeuverCommand } from '../commands/prepare-maneuver.command';

@CommandHandler(PrepareManeuverCommand)
export class PrepareManeuverHandler implements ICommandHandler<PrepareManeuverCommand, Action> {
  private readonly logger = new Logger(PrepareManeuverHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('CharacterRoundRepository') private readonly characterRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('AttackClient') private readonly attackClient: AttackClient,
    @Inject('ActionEventProducer') private readonly actionEventProducer: ActionEventProducer,
  ) {}

  async execute(command: PrepareManeuverCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
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
