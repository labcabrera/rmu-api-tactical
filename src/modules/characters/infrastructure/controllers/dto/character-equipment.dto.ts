import { CharacterEquipment } from '../../../domain/entities/character.entity';

export class CharacterEquipmentDto {
  mainHand: string | undefined;
  offHand: string | undefined;
  body: string | undefined;
  head: string | undefined;
  weight: number | undefined;

  static fromEntity(entity: CharacterEquipment): CharacterEquipmentDto {
    const dto = new CharacterEquipmentDto();
    dto.mainHand = entity.mainHand;
    dto.offHand = entity.offHand;
    dto.body = entity.body;
    dto.head = entity.head;
    dto.weight = entity.weight;
    return dto;
  }
}
