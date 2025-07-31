import { Page } from '@domain/entities/page.entity';
import { TacticalCharacterRound } from '@domain/entities/tactical-character-round.entity';
import { TacticalCharacter } from '@domain/entities/tactical-character.entity';
import { TacticalGame } from '@domain/entities/tactical-game.entity';
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRoundRepository } from '@domain/ports/tactical-character-round.repository';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';
import { TacticalGameRepository } from '@domain/ports/tactical-game.repository';

export class StartRoundUseCase {
    constructor(
        private readonly tacticalGameRepository: TacticalGameRepository,
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly tacticalCharacterRoundRepository: TacticalCharacterRoundRepository,
        private readonly logger: Logger
    ) { }

    async execute(gameId: string): Promise<TacticalGame> {
        this.logger.info(`StartRoundUseCase: Starting new round for tactical game: ${gameId}`);

        const tacticalGame: TacticalGame = await this.tacticalGameRepository.findById(gameId);
        const charactersPage: Page<TacticalCharacter> = await this.tacticalCharacterRepository.find({ gameId: gameId, page: 0, size: 100 });
        const characters: TacticalCharacter[] = charactersPage.content;

        this.logger.info(`Characters: ${JSON.stringify(characters)}`);

        if (characters.length < 1) {
            throw new Error('No characters associated with the tactical game have been defined');
        }

        const newRound = tacticalGame.round + 1;
        const updatedGame = await this.tacticalGameRepository.update(gameId, {
            ...tacticalGame,
            status: 'in-progress',
            round: newRound
        });
        await this.createCharacterRounds(characters, newRound);
        return updatedGame;
    }

    private async createCharacterRounds(characters: TacticalCharacter[], round: number): Promise<void> {
        for (const character of characters) {
            await this.createTacticalCharacterRound(character, round);
        }
    }

    private async createTacticalCharacterRound(character: TacticalCharacter, round: number): Promise<void> {
        const baseInitiative = character.initiative?.baseBonus || 0;
        //TODO check status effects
        const actionPoints: number = 4;
        const entity: Omit<TacticalCharacterRound, 'id'> = {
            gameId: character.gameId,
            round: round,
            tacticalCharacterId: character.id,
            initiative: {
                base: baseInitiative,
                penalty: 0,
                roll: 0,
                total: baseInitiative
            },
            actionPoints: 4
        };
        await this.tacticalCharacterRoundRepository.create(entity);
    }
}
