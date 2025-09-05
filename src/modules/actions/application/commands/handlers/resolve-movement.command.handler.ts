/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as crr from '../../../../actor-rounds/application/ports/out/character-round.repository';
import * as gr from '../../../../games/application/ports/out/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import * as cc from '../../../../strategic/application/ports/out/character-client';
import { Action } from '../../../domain/entities/action.entity';
import * as aep from '../../ports/out/action-event-producer';
import * as ar from '../../ports/out/action.repository';
import * as ac from '../../ports/out/attack-client';
import { ResolveMovementCommand } from '../resolve-movement.command';

@CommandHandler(ResolveMovementCommand)
export class ResolveMovementCommandHandler implements ICommandHandler<ResolveMovementCommand, Action> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: crr.ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ar.ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
    @Inject('AttackClient') private readonly attackClient: ac.AttackClient,
    @Inject('ActionEventProducer') private readonly actionEventProducer: aep.ActionEventProducer,
  ) {}

  async execute(command: ResolveMovementCommand): Promise<Action> {
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    this.validate(command, action);
    this.processAction(command, action);
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventProducer.updated(updated);
    return updated;
  }

  private processAction(command: ResolveMovementCommand, action: Action): void {
    //action.phase = command.phase;
  }

  private validate(command: ResolveMovementCommand, action: Action): void {
    if (action.actionType !== 'movement') {
      throw new ValidationError('Action is not a movement action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    }
  }
}
