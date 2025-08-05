import { inject, injectable } from 'inversify';

import { CharacterRound } from '@domain/entities/character-round.entity';
import { Character } from '@domain/entities/character.entity';
import { Game } from '@domain/entities/game.entity';
import { NotFoundError, ValidationError } from '@domain/errors/errors';

import { Logger } from '@application/ports/logger';
import { CharacterRoundRepository } from '@application/ports/outbound/character-round.repository';
import { CharacterRepository } from '@application/ports/outbound/character.repository';
import { GameRepository } from '@application/ports/outbound/game.repository';
import { TYPES } from '@shared/types';

@injectable()
export class StartRoundUseCase {
  constructor(
    @inject(TYPES.GameRepository) private readonly gameRepository: GameRepository,
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.CharacterRoundRepository) private readonly characterRoundRepository: CharacterRoundRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(gameId: string): Promise<Game> {
    this.logger.info(`Executing start round use case for game ${gameId}`);

    const tacticalGame = await this.gameRepository.findById(gameId);
    if (!tacticalGame) {
      throw new NotFoundError('Game', gameId);
    }

    const characters = await this.characterRepository.findByGameId(gameId);
    if (characters.length < 1) {
      throw new ValidationError('No characters associated with the game have been found');
    }

    const newRound = tacticalGame.round + 1;
    const updatedGame = await this.gameRepository.update(gameId, {
      ...tacticalGame,
      status: 'in_progress',
      round: newRound,
    });
    await this.createCharacterRounds(characters, newRound);
    return updatedGame;
  }

  private async createCharacterRounds(characters: Character[], round: number): Promise<void> {
    for (const character of characters) {
      await this.createTacticalCharacterRound(character, round);
    }
  }

  private async createTacticalCharacterRound(character: Character, round: number): Promise<void> {
    const baseInitiative = character.initiative?.baseBonus || 0;
    //TODO check status effects
    const actionPoints: number = 4;
    const entity: Omit<CharacterRound, 'id'> = {
      gameId: character.gameId,
      round: round,
      characterId: character.id,
      initiative: {
        base: baseInitiative,
        penalty: 0,
        roll: 0,
        total: baseInitiative,
      },
      actionPoints: 4,
    };
    await this.characterRoundRepository.save(entity);
  }
}
