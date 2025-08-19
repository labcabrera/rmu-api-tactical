import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { CharacterEndurance } from '../../../domain/entities/character.entity';

export class CharacterEnduranceDto {
  @ApiProperty({ description: 'Custom bonus', example: 5, default: 0 })
  @IsNumber()
  customBonus: number;

  @ApiProperty({ description: 'Maximum endurance', example: 100 })
  max: number;

  @ApiProperty({ description: 'Current endurance', example: 80 })
  current: number;

  @ApiProperty({ description: 'Endurance accumulator', example: 20 })
  accumulator: number;

  @ApiProperty({ description: 'Fatigue penalty', example: 5 })
  fatiguePenalty: number;

  static fromEntity(endurance: CharacterEndurance): CharacterEnduranceDto {
    const dto = new CharacterEnduranceDto();
    dto.customBonus = endurance.customBonus;
    dto.max = endurance.max;
    dto.current = endurance.current;
    dto.accumulator = endurance.accumulator;
    dto.fatiguePenalty = endurance.fatiguePenalty;
    return dto;
  }
}

export class CharacterEnduranceCreationDto {
  @ApiProperty({ description: 'Custom bonus', example: 5, default: 0 })
  @IsNumber()
  customBonus: number;
}
