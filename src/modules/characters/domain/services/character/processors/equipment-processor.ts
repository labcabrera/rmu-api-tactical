import { Injectable } from '@nestjs/common';
import { Character } from '../../../entities/character.entity';

@Injectable()
export class EquipmentProcessor {
  process(character: Partial<Character>): void {
    const total = character.items!.reduce((sum, item) => sum + item.info.weight, 0);
    character.equipment!.weight = total;
  }
}
