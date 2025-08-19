import { CharacterDefense } from '../../../domain/entities/character.entity';

export class CharacterDefenseDto {
  armorType: number;
  defensiveBonus: number;

  static fromEntity(entity: CharacterDefense): CharacterDefenseDto {
    const dto = new CharacterDefenseDto();
    dto.armorType = entity.armorType;
    dto.defensiveBonus = entity.defensiveBonus;
    return dto;
  }
}
