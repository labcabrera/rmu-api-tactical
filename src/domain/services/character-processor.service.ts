import { inject, injectable } from 'inversify';

import { Character } from '@domain/entities/character.entity';
import { Logger } from '@domain/ports/logger';

import { TYPES } from '@shared/types';
import { ArmorProcessor } from './character/processors/amor-processor';
import { AttackProcessor } from './character/processors/attack-processor';
import { InitiativeProcessor } from './character/processors/initiative-processor';
import { MovementProcessor } from './character/processors/movement-processor';
import { SkillProcessor } from './character/processors/skill-processor';

@injectable()
export class CharacterProcessorService {
  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

  process(character: Character): void {
    this.logger.info(`CharacterProcessorService: Processing character << ${character.name} (${character.id})`);

    try {
      MovementProcessor.process(character);
      InitiativeProcessor.process(character);
      SkillProcessor.process(character);
      AttackProcessor.process(character);
      ArmorProcessor.process(character);
      //TODO add weight processor
      //TODO add items processor
    } catch (error) {
      this.logger.error(`CharacterProcessorService: Error processing character ${character.name}: ${error}`);
      throw error;
    }
  }
}
