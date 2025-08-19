import { ApiProperty } from '@nestjs/swagger';

import { IsNumber } from 'class-validator';
import { CharacterInitiative } from '../../../domain/entities/character.entity';

export class CharacterInitiativeDto {
  @ApiProperty({ description: 'Base initiative bonus', example: 2 })
  baseBonus: number;

  @ApiProperty({ description: 'Custom initiative bonus', example: 1 })
  customBonus: number;

  @ApiProperty({ description: 'Penalty initiative bonus', example: -1 })
  penaltyBonus: number;

  @ApiProperty({ description: 'Total initiative bonus', example: 2 })
  totalBonus: number;

  static fromEntity(initiative: CharacterInitiative): CharacterInitiativeDto {
    const dto = new CharacterInitiativeDto();
    dto.baseBonus = initiative.baseBonus;
    dto.customBonus = initiative.customBonus;
    dto.penaltyBonus = initiative.penaltyBonus;
    dto.totalBonus = initiative.totalBonus;
    return dto;
  }
}

export class CharacterInitiativeCreationDto {
  @ApiProperty({ description: 'Custom initiative bonus', example: 1 })
  @IsNumber()
  customBonus: number;

  static fromEntity(initiative: CharacterInitiative): CharacterInitiativeCreationDto {
    const dto = new CharacterInitiativeCreationDto();
    dto.customBonus = initiative.customBonus;
    return dto;
  }
}
