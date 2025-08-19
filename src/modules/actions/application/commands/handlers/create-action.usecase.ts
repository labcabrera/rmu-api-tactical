import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as characterRoundRepository from '../../../../character-rounds/application/ports/out/character-round.repository';
import * as characterRepository from '../../../../characters/application/ports/out/character.repository';
import * as gameRepository from '../../../../games/application/ports/out/game.repository';
import { Action } from '../../../domain/entities/action.entity';
import * as actionRepository from '../../ports/out/action.repository';
import { CreateActionCommand } from '../create-action.command';

@CommandHandler(CreateActionCommand)
export class CreateActionCommandHandler implements ICommandHandler<CreateActionCommand, Action> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('CharacterRoundRepository') private readonly characterRoundRepository: characterRoundRepository.CharacterRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: actionRepository.ActionRepository,
  ) {}

  async execute(command: CreateActionCommand): Promise<Action> {
    const action: Partial<Action> = {
      gameId: command.gameId,
      round: command.round,
      characterId: command.characterId,
      actionType: command.actionType,
      phaseStart: command.phaseStart,
      actionPoints: command.actionPoints,
      createdAt: new Date(),
    };
    return this.actionRepository.save(action);
  }
}
