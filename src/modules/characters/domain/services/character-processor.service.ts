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
  constructor(
    private readonly statProcessor: StatProcessor,
    private readonly movementProcessor: MovementProcessor,
    private readonly initiativeProcessor: InitiativeProcessor,
    private readonly skillProcessor: SkillProcessor,
    private readonly attackProcessor: AttackProcessor,
    private readonly equipmentProcessor: EquipmentProcessor,
    private readonly hPProcessor: HPProcessor,
    private readonly defenseProcessor: DefenseProcessor,
  ) {}

  process(character: Partial<Character>): void {
    this.statProcessor.process(character);
    this.movementProcessor.process(character);
    this.initiativeProcessor.process(character);
    this.skillProcessor.process(character);
    this.attackProcessor.process(character);
    this.equipmentProcessor.process(character);
    this.hPProcessor.process(character);
    this.defenseProcessor.process(character);
  }
}
