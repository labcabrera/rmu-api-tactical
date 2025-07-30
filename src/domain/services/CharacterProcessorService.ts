import { TacticalCharacterEntity } from '../entities/tactical-character.entity';
import { Logger } from '../ports/Logger';
import { AttackProcessor } from './character/processors/AttackProcessor';
import { InitiativeProcessor } from './character/processors/InitiativeProcessor';
import { MovementProcessor } from './character/processors/MovementProcessor';
import { SkillProcessor } from './character/processors/SkillProcessor';

/**
 * Domain service responsible for processing and calculating character attributes.
 * This service orchestrates various processors to update character state.
 */
export class CharacterProcessorService {
    constructor(private readonly logger: Logger) { }

    /**
     * Process a character by applying all relevant calculations and updates.
     * This includes movement, initiative, skills, and attack calculations.
     * 
     * @param character - The tactical character to process
     */
    process(character: TacticalCharacterEntity): void {
        this.logger.info(`CharacterProcessorService: Processing character: ${character.name} (${character.id})`);

        try {
            // Process character attributes in order
            MovementProcessor.process(character);
            InitiativeProcessor.process(character);
            SkillProcessor.process(character);
            AttackProcessor.process(character);

            this.logger.info(`CharacterProcessorService: Successfully processed character: ${character.name}`);
        } catch (error) {
            this.logger.error(`CharacterProcessorService: Error processing character ${character.name}: ${error}`);
            throw error;
        }
    }
}
