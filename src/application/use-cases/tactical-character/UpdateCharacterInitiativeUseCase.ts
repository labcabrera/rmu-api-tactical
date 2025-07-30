import { Logger } from '../../../domain/ports/Logger';
import { TacticalCharacterRoundRepository } from '../../../domain/ports/TacticalCharacterRoundRepository';

export interface UpdateCharacterInitiativeCommand {
    tacticalCharacterRoundId: string;
    initiativeRoll: number;
}

export interface CharacterRoundInitiative {
    id: string;
    gameId: string;
    tacticalCharacterId: string;
    round: number;
    initiative: {
        base: number;
        penalty: number;
        roll: number;
        total: number;
    };
    actionPoints: number;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Use case for updating a character's initiative roll in a tactical game round.
 * This use case handles the business logic for calculating the total initiative
 * based on the base initiative and the dice roll.
 */
export class UpdateCharacterInitiativeUseCase {
    constructor(
        private readonly tacticalCharacterRoundRepository: TacticalCharacterRoundRepository,
        private readonly logger: Logger
    ) { }

    async execute(command: UpdateCharacterInitiativeCommand): Promise<CharacterRoundInitiative> {
        this.logger.info(`Updating initiative for character round: ${command.tacticalCharacterRoundId} with roll: ${command.initiativeRoll}`);

        // Find the character round
        const characterRound = await this.tacticalCharacterRoundRepository.findById(command.tacticalCharacterRoundId);
        if (!characterRound) {
            this.logger.error(`Tactical character round not found: ${command.tacticalCharacterRoundId}`);
            throw new Error('Tactical character round not found');
        }

        // Calculate total initiative
        const baseInitiative = characterRound.initiative?.base || 0;
        const penalty = characterRound.initiative?.penalty || 0;
        const total = baseInitiative + penalty + command.initiativeRoll;

        // Update the character round with new initiative
        const updatedCharacterRound = await this.tacticalCharacterRoundRepository.update(
            command.tacticalCharacterRoundId,
            {
                initiative: {
                    base: baseInitiative,
                    penalty: penalty,
                    roll: command.initiativeRoll,
                    total: total
                }
            }
        );

        if (!updatedCharacterRound) {
            this.logger.error(`Failed to update character round: ${command.tacticalCharacterRoundId}`);
            throw new Error('Failed to update character round');
        }

        this.logger.info(`Initiative updated successfully for character round: ${command.tacticalCharacterRoundId}. Total: ${total}`);

        return this.mapToCharacterRoundInitiative(updatedCharacterRound);
    }

    private mapToCharacterRoundInitiative(characterRound: any): CharacterRoundInitiative {
        return {
            id: characterRound.id,
            gameId: characterRound.gameId,
            tacticalCharacterId: characterRound.tacticalCharacterId,
            round: characterRound.round,
            initiative: {
                base: characterRound.initiative?.base || 0,
                penalty: characterRound.initiative?.penalty || 0,
                roll: characterRound.initiative?.roll || 0,
                total: characterRound.initiative?.total || 0,
            },
            actionPoints: characterRound.actionPoints || 0,
            createdAt: characterRound.createdAt,
            updatedAt: characterRound.updatedAt,
        };
    }
}
