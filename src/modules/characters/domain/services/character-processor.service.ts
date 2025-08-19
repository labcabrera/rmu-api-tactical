import { Injectable } from '@nestjs/common';

import { Character } from '../entities/character.entity';
import { AttackProcessor } from './character/processors/attack-processor';
import { DefenseProcessor } from './character/processors/defense-processor';
import { EquipmentProcessor } from './character/processors/equipment-processor';
import { HPProcessor } from './character/processors/hp-processor';
import { InitiativeProcessor } from './character/processors/initiative-processor';
import { MovementProcessor } from './character/processors/movement-processor';
import { SkillProcessor } from './character/processors/skill-processor';
import { StatProcessor } from './character/processors/stat-processor';

@Injectable()
export class CharacterProcessorService {
  constructor(private readonly statProcessor: StatProcessor) {}

  process(character: Partial<Character>): void {
    this.statProcessor.process(character);
    MovementProcessor.process(character);
    InitiativeProcessor.process(character);
    SkillProcessor.process(character);
    AttackProcessor.process(character);
    EquipmentProcessor.process(character);
    HPProcessor.process(character);
    DefenseProcessor.process(character);
  }
}
