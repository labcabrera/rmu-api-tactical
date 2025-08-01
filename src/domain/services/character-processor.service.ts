import { Character } from "../entities/character.entity";
import { Logger } from "../ports/logger";
import { ArmorProcessor } from "./character/processors/amor-processor";
import { AttackProcessor } from "./character/processors/attack-processor";
import { InitiativeProcessor } from "./character/processors/initiative-processor";
import { MovementProcessor } from "./character/processors/movement-processor";
import { SkillProcessor } from "./character/processors/skill-processor";

export class CharacterProcessorService {
  constructor(private readonly logger: Logger) {}

  process(character: Character): void {
    this.logger.info(
      `CharacterProcessorService: Processing character << ${character.name} (${character.id})`,
    );

    try {
      MovementProcessor.process(character);
      InitiativeProcessor.process(character);
      SkillProcessor.process(character);
      AttackProcessor.process(character);
      ArmorProcessor.process(character);
      //TODO add weight processor
      //TODO add items processor
    } catch (error) {
      this.logger.error(
        `CharacterProcessorService: Error processing character ${character.name}: ${error}`,
      );
      throw error;
    }
  }
}
