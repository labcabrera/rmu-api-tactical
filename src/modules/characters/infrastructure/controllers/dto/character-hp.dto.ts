import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { CharacterHP } from '../../../domain/entities/character.entity';

export class CharacterHPDto {
  @ApiProperty({ description: 'Custom bonus', example: 5, default: 0 })
  @IsNumber()
  customBonus: number;

  @ApiProperty({ description: 'Maximum HP', example: 100 })
  max: number;

  @ApiProperty({ description: 'Current HP', example: 80 })
  current: number;

  static fromEntity(hp: CharacterHP): CharacterHPDto {
    const dto = new CharacterHPDto();
    dto.customBonus = hp.customBonus;
    dto.max = hp.max;
    dto.current = hp.current;
    return dto;
  }
}

export class CharacterHPCreationDto {
  @ApiProperty({ description: 'Custom bonus', example: 5, default: 0 })
  @IsNumber()
  customBonus: number;
}
