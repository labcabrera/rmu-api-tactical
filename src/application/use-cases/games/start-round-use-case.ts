import { CharacterRound } from "@domain/entities/character-round.entity";
import { Character } from "@domain/entities/character.entity";
import { Game } from "@domain/entities/game.entity";
import { Page } from "@domain/entities/page.entity";
import { Logger } from "@domain/ports/logger";
import { CharacterRoundRepository } from "@domain/ports/outbound/character-round.repository";
import { CharacterRepository } from "@domain/ports/outbound/character.repository";
import { GameRepository } from "@domain/ports/outbound/game.repository";

export class StartRoundUseCase {
  constructor(
    private readonly gameRepository: GameRepository,
    private readonly characterRepository: CharacterRepository,
    private readonly characterRoundRepository: CharacterRoundRepository,
    private readonly logger: Logger,
  ) {}

  async execute(gameId: string): Promise<Game> {
    this.logger.info(
      `StartRoundUseCase: Starting new round for tactical game: ${gameId}`,
    );

    const tacticalGame: Game = await this.gameRepository.findById(gameId);
    const charactersPage: Page<Character> = await this.characterRepository.find(
      {
        gameId: gameId,
        page: 0,
        size: 100,
      },
    );
    const characters: Character[] = charactersPage.content;

    this.logger.info(`Characters: ${JSON.stringify(characters)}`);

    if (characters.length < 1) {
      throw new Error(
        "No characters associated with the tactical game have been defined",
      );
    }

    const newRound = tacticalGame.round + 1;
    const updatedGame = await this.gameRepository.update(gameId, {
      ...tacticalGame,
      status: "in-progress",
      round: newRound,
    });
    await this.createCharacterRounds(characters, newRound);
    return updatedGame;
  }

  private async createCharacterRounds(
    characters: Character[],
    round: number,
  ): Promise<void> {
    for (const character of characters) {
      await this.createTacticalCharacterRound(character, round);
    }
  }

  private async createTacticalCharacterRound(
    character: Character,
    round: number,
  ): Promise<void> {
    const baseInitiative = character.initiative?.baseBonus || 0;
    //TODO check status effects
    const actionPoints: number = 4;
    const entity: Omit<CharacterRound, "id"> = {
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
    await this.characterRoundRepository.create(entity);
  }
}
