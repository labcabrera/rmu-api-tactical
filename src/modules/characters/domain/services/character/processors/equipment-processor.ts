import { Character } from '../../../entities/character.entity';

export class EquipmentProcessor {
  static process(character: Partial<Character>): void {
    const total = character.items!.reduce((sum, item) => sum + item.info.weight, 0);
    character.equipment!.weight = total;
  }
}
