import { Character } from '../../../entities/character.entity';

export class DefenseProcessor {
  static process(character: Partial<Character>): void {
    this.processArmorType(character);
  }

  private static processArmorType(character: Partial<Character>): void {
    if (!character.equipment || !character.equipment.body || !character.items || !character.defense) {
      return;
    }
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

  private static processDefensiveBonus(character: Partial<Character>): void {
    if (!character.defense) {
      return;
    }
    const quBonus = character.statistics?.qu.totalBonus || 0;
    character.defense.defensiveBonus = quBonus * 3;
  }
}
