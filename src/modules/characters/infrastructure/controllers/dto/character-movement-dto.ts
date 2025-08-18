import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber } from 'class-validator';
import { CharacterMovement } from '../../../domain/entities/character.entity';

export class CharacterMovementDto {
  baseMovementRate: number;
  strideRacialBonus: number;
  strideQuBonus: number;
  strideCustomBonus: number;

  static fromEntity(movement: CharacterMovement): CharacterMovementDto {
    const dto = new CharacterMovementDto();
    dto.baseMovementRate = movement.baseMovementRate;
    dto.strideRacialBonus = movement.strideRacialBonus;
    dto.strideQuBonus = movement.strideQuBonus;
    return dto;
  }
}

export class CharacterMovementCreationDto {
  @ApiProperty({ description: 'Stride custom bonus', example: 1 })
  @IsNumber()
  @IsNotEmpty()
  strideCustomBonus: number;
}
