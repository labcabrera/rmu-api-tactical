import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as characterRoundRepository from '../../../../character-rounds/application/ports/out/character-round.repository';
import { CharacterRound } from '../../../../character-rounds/domain/entities/character-round.entity';
import * as characterRepository from '../../../../characters/application/ports/out/character.repository';
import { Character } from '../../../../characters/domain/entities/character.entity';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import { Game } from '../../../domain/entities/game.entity';
import * as gameEventProducer from '../../ports/out/game-event-producer';
import * as gameRepository from '../../ports/out/game.repository';
import { StartRoundCommand } from '../start-round.command';

@CommandHandler(StartRoundCommand)
export class StartRoundCommandHandler implements ICommandHandler<StartRoundCommand, Game> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('CharacterRoundRepository') private readonly characterRoundRepository: characterRoundRepository.CharacterRoundRepository,
    @Inject('GameEventProducer') private readonly gameEventProducer: gameEventProducer.GameEventProducer,
  ) {}

  async execute(command: StartRoundCommand): Promise<Game> {
    const { gameId } = command;
    const tacticalGame = await this.gameRepository.findById(gameId);
    if (!tacticalGame) {
      throw new NotFoundError('Game', gameId);
    }

    const characters = await this.characterRepository.findByGameId(gameId);
    if (characters.length < 1) {
      throw new ValidationError('No characters associated with the game have been found');
    }

    const gameUpdate: Partial<Game> = {
      ...tacticalGame,
      status: 'in_progress',
      round: tacticalGame.round + 1,
    };
    const updatedGame = await this.gameRepository.update(gameId, gameUpdate);
    await this.createCharacterRounds(characters, updatedGame.round);
    await this.gameEventProducer.updated(updatedGame);
    return updatedGame;
  }

  private async createCharacterRounds(characters: Character[], round: number): Promise<void> {
    for (const character of characters) {
      await this.createTacticalCharacterRound(character, round);
    }
  }

  private async createTacticalCharacterRound(character: Character, round: number): Promise<void> {
    const baseInitiative = character.initiative?.baseBonus || 0;
    const entity: Partial<CharacterRound> = {
      gameId: character.gameId,
      characterId: character.id,
      round: round,
      initiative: {
        base: baseInitiative,
        penalty: 0,
        roll: undefined,
        total: undefined,
      },
      actionPoints: 4,
      hp: {
        current: character.hp.current,
        max: character.hp.max,
      },
      effects: [],
      owner: character.owner,
      createdAt: new Date(),
    };
    await this.characterRoundRepository.save(entity);
  }
}
