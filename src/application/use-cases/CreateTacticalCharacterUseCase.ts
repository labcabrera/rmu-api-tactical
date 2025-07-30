import { CreateTacticalCharacterCommand, TacticalCharacterEntity } from '../../domain/entities/TacticalCharacter';
import { Logger } from '../../domain/ports/Logger';
import { TacticalCharacterRepository } from '../../domain/ports/TacticalCharacterRepository';
import { TacticalGameRepository } from '../../domain/ports/TacticalGameRepository';

export class CreateTacticalCharacterUseCase {
    constructor(
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private tacticalGameRepository: TacticalGameRepository,
        private logger: Logger
    ) { }

    async execute(command: CreateTacticalCharacterCommand): Promise<TacticalCharacterEntity> {
        this.logger.info(`Creating tactical character: ${command.name} for game: ${command.tacticalGameId}`);

        // Validate tactical game exists
        const tacticalGame = await this.tacticalGameRepository.findById(command.tacticalGameId);
        if (!tacticalGame) {
            throw new Error('Tactical game not found');
        }

        // Validate faction is provided
        if (!command.faction) {
            throw new Error('Required faction');
        }

        // Validate faction is valid for the game
        if (!tacticalGame.factions.includes(command.faction)) {
            throw new Error('Invalid faction');
        }

        // Validate required fields
        if (!command.info || !command.info.race) {
            throw new Error('Required race');
        }

        if (!command.endurance || !command.endurance.max) {
            throw new Error('Required endurance');
        }

        if (!command.hp || !command.hp.max) {
            throw new Error('Required HP');
        }

        // Create character entity
        const characterData: Omit<TacticalCharacterEntity, 'id' | 'createdAt' | 'updatedAt'> = {
            gameId: command.tacticalGameId,
            name: command.name,
            faction: command.faction,
            maxHitPoints: command.hp.max,
            hitPoints: command.hp.max,
            skills: command.skills || [],
            equipment: []
        };

        const newCharacter = await this.tacticalCharacterRepository.create(characterData);

        this.logger.info(`Tactical character created successfully: ${newCharacter.id}`);
        return newCharacter;
    }
}
