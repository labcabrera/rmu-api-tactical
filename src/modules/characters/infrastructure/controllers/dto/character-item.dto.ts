import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import {
  CharacterItem,
  CharacterItemArmor,
  CharacterItemInfo,
  CharacterItemWeapon,
  CharacterItemWeaponRange,
} from '../../../domain/entities/character.entity';

export class CharacterItemDto {
  id: string;
  name: string;
  itemTypeId: string;
  category: string;
  weapon: CharacterItemWeaponDto | undefined;
  weaponRange: CharacterItemWeaponRangeDto[] | undefined;
  armor: CharacterItemArmorDto | undefined;
  info: CharacterItemInfoDto;

  static fromEntity(item: CharacterItem): CharacterItemDto {
    const dto = new CharacterItemDto();
    dto.id = item.id;
    dto.name = item.name;
    dto.itemTypeId = item.itemTypeId;
    dto.category = item.category;
    dto.weapon = item.weapon ? CharacterItemWeaponDto.fromEntity(item.weapon) : undefined;
    dto.weaponRange = item.weaponRange ? item.weaponRange.map((e) => CharacterItemWeaponRangeDto.fromEntity(e)) : undefined;
    dto.armor = item.armor ? CharacterItemArmorDto.fromEntity(item.armor) : undefined;
    dto.info = CharacterItemInfoDto.fromEntity(item.info);
    return dto;
  }
}

export class CharacterItemInfoDto {
  length: number;
  strength: number;
  weight: number;
  productionTime: number;

  static fromEntity(info: CharacterItemInfo): CharacterItemInfoDto {
    const dto = new CharacterItemInfoDto();
    dto.length = info.length;
    dto.strength = info.strength;
    dto.weight = info.weight;
    dto.productionTime = info.productionTime;
    return dto;
  }
}

export class CharacterItemWeaponDto {
  attackTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;

  static fromEntity(entity: CharacterItemWeapon): CharacterItemWeaponDto | undefined {
    if (!entity) return undefined;
    const dto = new CharacterItemWeaponDto();
    dto.attackTable = entity.attackTable;
    dto.skillId = entity.skillId;
    dto.fumble = entity.fumble;
    dto.sizeAdjustment = entity.sizeAdjustment;
    dto.requiredHands = entity.requiredHands;
    dto.throwable = entity.throwable;
    return dto;
  }
}

export class CharacterItemWeaponRangeDto {
  from: number;
  to: number;
  bonus: number;

  static fromEntity(entity: CharacterItemWeaponRange): CharacterItemWeaponRangeDto {
    const dto = new CharacterItemWeaponRangeDto();
    dto.from = entity.from;
    dto.to = entity.to;
    dto.bonus = entity.bonus;
    return dto;
  }
}

export class CharacterItemArmorDto {
  slot: string;
  armorType: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;

  static fromEntity(entity: CharacterItemArmor): CharacterItemArmorDto {
    const dto = new CharacterItemArmorDto();
    dto.slot = entity.slot;
    dto.armorType = entity.armorType;
    dto.enc = entity.enc;
    dto.maneuver = entity.maneuver;
    dto.rangedPenalty = entity.rangedPenalty;
    dto.perception = entity.perception;
    return dto;
  }
}

export class CharacterItemCreationDto {
  @ApiProperty({ description: 'The name of the item' })
  @IsString()
  @IsOptional()
  name: string | undefined;

  @ApiProperty({ description: 'The name of the item' })
  @IsString()
  @IsNotEmpty()
  itemTypeId: string;
}
