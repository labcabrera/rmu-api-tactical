import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { randomUUID } from 'crypto';
import * as characterRoundRepository from '../../../../character-rounds/application/ports/out/character-round.repository';
import * as characterRepository from '../../../../characters/application/ports/out/character.repository';
import * as gameRepository from '../../../../games/application/ports/out/game.repository';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action, ActionAttack } from '../../../domain/entities/action.entity';
import * as actionEventProducer from '../../ports/out/action-event-producer';
import * as actionRepository from '../../ports/out/action.repository';
import { PrepareAttackCommand } from '../prepare-attack.command';

@CommandHandler(PrepareAttackCommand)
export class PrepareAttackCommandHandler implements ICommandHandler<PrepareAttackCommand, Action> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('CharacterRoundRepository') private readonly characterRoundRepository: characterRoundRepository.CharacterRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: actionRepository.ActionRepository,
    @Inject('ActionEventProducer') private readonly actionEventProducer: actionEventProducer.ActionEventProducer,
  ) {}

  async execute(command: PrepareAttackCommand): Promise<Action> {
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new ValidationError('Action not found');
    }
    if (action.actionType !== 'attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (action.status !== 'declared') {
      throw new ValidationError('Action is not in a preparable state');
    }
    const attack = action.attacks?.find((attack) => attack.attackType === command.attackType);
    if (!attack) {
      throw new ValidationError(`Attack type ${command.attackType} not found in action`);
    }
    this.createAttack(attack);
    action.status = 'in_progress';
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventProducer.updated(updated);
    return updated;
  }

  private createAttack(attack: ActionAttack): void {
    //TODO send to port
    attack.attackId = randomUUID();
    attack.status = 'in_progress';
  }
}
