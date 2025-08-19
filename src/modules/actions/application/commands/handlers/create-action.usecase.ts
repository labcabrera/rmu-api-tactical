import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as characterRoundRepository from '../../../../character-rounds/application/ports/out/character-round.repository';
import { CharacterRound } from '../../../../character-rounds/domain/entities/character-round.entity';
import * as characterRepository from '../../../../characters/application/ports/out/character.repository';
import { Character } from '../../../../characters/domain/entities/character.entity';
import * as gameRepository from '../../../../games/application/ports/out/game.repository';
import { Game } from '../../../../games/domain/entities/game.entity';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action, ActionAttack } from '../../../domain/entities/action.entity';
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
    this.validate(command);
    const game = await this.readGame(command);
    if (game.round < 1) {
      throw new ValidationError(`Game ${game.name} is not in progress. You need to start the game.`);
    }
    const character = await this.readCharacter(command);
    const characterRound = await this.readCharacterRound(command, game.round);
    const actions = await this.readActions(command, game.round);

    const availableActionPoints = characterRound.actionPoints;
    const usedActionPoints = actions.reduce((total, action) => total + action.actionPoints, 0);
    const remainingActionPoints = availableActionPoints - usedActionPoints;

    if (remainingActionPoints < command.actionPoints) {
      throw new ValidationError(`Not enough action points. Available: ${remainingActionPoints}, Required: ${command.actionPoints}`);
    }

    if (command.attacks) {
      command.attacks.forEach((attack) => {
        if (!attack.attackType || !attack.targetId || attack.parry === undefined) {
          throw new ValidationError(`Invalid attack data`);
        }
      });
    }
    const attacks = this.prepareAttacks(command);
    const action: Partial<Action> = {
      gameId: command.gameId,
      status: 'declared',
      round: game.round,
      characterId: command.characterId,
      actionType: command.actionType,
      phaseStart: command.phaseStart,
      actionPoints: command.actionPoints,
      attacks: attacks,
      description: `${character.name} ${command.actionType}`,
      createdAt: new Date(),
    };
    return this.actionRepository.save(action);
  }

  private async readGame(command: CreateActionCommand): Promise<Game> {
    const game = await this.gameRepository.findById(command.gameId);
    if (!game) {
      throw new ValidationError(`Game ${command.gameId} not found`);
    }
    return game;
  }

  private async readCharacter(command: CreateActionCommand): Promise<Character> {
    const character = await this.characterRepository.findById(command.characterId);
    if (!character) {
      throw new ValidationError(`Character ${command.characterId} not found`);
    }
    return character;
  }

  private async readCharacterRound(command: CreateActionCommand, round: number): Promise<CharacterRound> {
    const rsql = `gameId==${command.gameId};characterId==${command.characterId};round==${round}`;
    const characterRounds = await this.characterRoundRepository.findByRsql(rsql, 0, 100);
    if (characterRounds.content.length === 0) {
      throw new ValidationError(`CharacterRound for game ${command.gameId}, character ${command.characterId}, round ${round} not found`);
    }
    return characterRounds.content[0];
  }

  private async readActions(command: CreateActionCommand, round: number): Promise<Action[]> {
    const rsql = `gameId==${command.gameId};characterId==${command.characterId};round==${round}`;
    const actions = await this.actionRepository.findByRsql(rsql, 0, 100);
    return actions.content;
  }

  private prepareAttacks(command: CreateActionCommand): ActionAttack[] | undefined {
    if (!command.attacks || command.attacks.length === 0) {
      return undefined;
    }
    return command.attacks.map((attack) => {
      return {
        attackType: attack.attackType,
        targetId: attack.targetId,
        parry: attack.parry,
        status: 'declared',
      } as ActionAttack;
    });
  }

  private validate(command: CreateActionCommand): void {
    //TODO check target exists
    if (command.actionType === 'attack' && (!command.attacks || command.attacks.length === 0)) {
      throw new ValidationError(`At least one attack must be provided`);
    }
  }
}
