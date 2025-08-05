import { Character } from '../../../entities/character.entity';

export class ArmorProcessor {
  static process(character: Character): void {
    if (character.equipment.body) {
      const itemId = character.equipment.body;
      const item = character.items.find((e: any) => e.id == itemId);
      if (item && item.armor && item.armor.armorType) {
        character.defense.armorType = item.armor.armorType;
      }
    } else {
      //TODO read from racial
      character.defense.armorType = 1;
    }
  }
}
