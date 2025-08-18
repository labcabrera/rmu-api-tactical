import { Injectable } from '@nestjs/common';

import { Character } from '../entities/character.entity';
import { ArmorProcessor } from './character/processors/amor-processor';
import { AttackProcessor } from './character/processors/attack-processor';
import { EquipmentProcessor } from './character/processors/equipment-processor';
import { HPProcessor } from './character/processors/hp-processor';
import { InitiativeProcessor } from './character/processors/initiative-processor';
import { MovementProcessor } from './character/processors/movement-processor';
import { SkillProcessor } from './character/processors/skill-processor';

@Injectable()
export class CharacterProcessorService {
  process(character: Partial<Character>): void {
    MovementProcessor.process(character);
    InitiativeProcessor.process(character);
    SkillProcessor.process(character);
    AttackProcessor.process(character);
    EquipmentProcessor.process(character);
    ArmorProcessor.process(character);
    HPProcessor.process(character);
  }
}
