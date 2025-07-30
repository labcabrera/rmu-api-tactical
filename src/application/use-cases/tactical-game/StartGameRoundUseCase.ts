import { TacticalCharacterEntity } from '../../../domain/entities/tactical-character.entity';
import { TacticalGame } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/Logger';
import { TacticalCharacterRepository } from '../../../domain/ports/TacticalCharacterRepository';
import { TacticalGameRepository } from '../../../domain/ports/TacticalGameRepository';

export class StartGameRoundUseCase {
    constructor(
        private readonly tacticalGameRepository: TacticalGameRepository,
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(gameId: string): Promise<TacticalGame> {
        this.logger.info(`Starting new round for tactical game: ${gameId}`);

        // Find the tactical game
        const tacticalGame = await this.tacticalGameRepository.findById(gameId);
        if (!tacticalGame) {
            this.logger.error(`Tactical game not found: ${gameId}`);
            throw new Error('Tactical game not found');
        }

        // Find characters in the game
        const charactersResult = await this.tacticalCharacterRepository.find({ tacticalGameId: gameId, page: 0, size: 100 });
        const characters = charactersResult.content;
        if (characters.length < 1) {
            this.logger.error(`No characters found for tactical game: ${gameId}`);
            throw new Error('No characters associated with the tactical game have been defined');
        }

        // Calculate new round number
        const newRound = tacticalGame.round + 1;
        this.logger.info(`Starting round ${newRound} for game ${gameId}`);

        // Update game state to new round
        const updatedGame = await this.tacticalGameRepository.update(gameId, {
            ...tacticalGame,
            status: 'in-progress',
            round: newRound
        });

        if (!updatedGame) {
            this.logger.error(`Failed to update tactical game: ${gameId}`);
            throw new Error('Failed to update tactical game');
        }

        // Create character rounds for all characters
        await this.createCharacterRounds(characters, newRound);

        this.logger.info(`Successfully started round ${newRound} for game ${gameId}`);
        return updatedGame;
    }

    private async createCharacterRounds(characters: TacticalCharacterEntity[], round: number): Promise<void> {
        for (const character of characters) {
            await this.createTacticalCharacterRound(character, round);
        }
    }

    private async createTacticalCharacterRound(character: TacticalCharacterEntity, round: number): Promise<void> {
        const baseInitiative = character.initiative?.baseBonus || 0;

        // TODO: Implement character round creation through a dedicated repository
        // For now, this is a placeholder that should be implemented when
        // TacticalCharacterRoundRepository is created
        this.logger.info(`Creating character round for ${character.name} (${character.id}) in round ${round} with base initiative ${baseInitiative}`);

        // The actual implementation would be:
        // const characterRound = {
        //     gameId: character.gameId,
        //     round: round,
        //     tacticalCharacterId: character.id,
        //     initiative: {
        //         base: baseInitiative,
        //         penalty: 0,
        //         roll: 0,
        //         total: baseInitiative
        //     },
        //     actionPoints: 4
        // };
        // await this.tacticalCharacterRoundRepository.create(characterRound);
    }
}
