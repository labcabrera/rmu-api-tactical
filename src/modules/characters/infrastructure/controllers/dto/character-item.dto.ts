import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { CharacterItem, CharacterItemInfo, CharacterItemWeapon } from '../../../domain/entities/character.entity';

export class CharacterItemDto {
  id: string;
  name: string;
  itemTypeId: string;
  category: string;
  weapon?: CharacterItemWeaponDto | undefined;
  info: CharacterItemInfoDto;

  static fromEntity(item: CharacterItem): CharacterItemDto {
    const dto = new CharacterItemDto();
    dto.id = item.id;
    dto.name = item.name;
    dto.itemTypeId = item.itemTypeId;
    dto.category = item.category;
    dto.weapon = item.weapon ? CharacterItemWeaponDto.fromEntity(item.weapon) : undefined;
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

  static fromEntity(weapon: CharacterItemWeapon): CharacterItemWeaponDto | undefined {
    if (!weapon) return undefined;
    const dto = new CharacterItemWeaponDto();
    dto.attackTable = weapon.attackTable;
    dto.skillId = weapon.skillId;
    dto.fumble = weapon.fumble;
    dto.sizeAdjustment = weapon.sizeAdjustment;
    dto.requiredHands = weapon.requiredHands;
    dto.throwable = weapon.throwable;
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
