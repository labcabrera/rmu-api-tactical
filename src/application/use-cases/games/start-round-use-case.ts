import { CharacterRound } from '@domain/entities/character-round.entity';
import { Character } from '@domain/entities/character.entity';
import { Game } from '@domain/entities/game.entity';
import { Logger } from '@domain/ports/logger';
import { CharacterRoundRepository } from '@domain/ports/outbound/character-round.repository';
import { CharacterRepository } from '@domain/ports/outbound/character.repository';
import { GameRepository } from '@domain/ports/outbound/game.repository';
import { inject, injectable } from '@inversifyjs/core';
import { NotFoundError, ValidationError } from '../../../domain/errors/errors';
import { TYPES } from '../../../shared/types';

@injectable()
export class StartRoundUseCase {
  constructor(
    @inject(TYPES.GameRepository) private readonly gameRepository: GameRepository,
    @inject(TYPES.CharacterRepository) private readonly characterRepository: CharacterRepository,
    @inject(TYPES.CharacterRoundRepository) private readonly characterRoundRepository: CharacterRoundRepository,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(gameId: string): Promise<Game> {
    this.logger.info(`StartRoundUseCase: Starting new round for tactical game: ${gameId}`);
    const tacticalGame = await this.gameRepository.findById(gameId);
    if (!tacticalGame) {
      throw new NotFoundError("Game",gameId);
    }
    const characters = await this.characterRepository.findByGameId(gameId);
    this.logger.info(`Characters: ${JSON.stringify(characters)}`);
    if (characters.length < 1) {
      throw new ValidationError('No characters associated with the tactical game have been defined');
    }

    const newRound = tacticalGame.round + 1;
    const updatedGame = await this.gameRepository.update(gameId, {
      ...tacticalGame,
      status: 'in-progress',
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
