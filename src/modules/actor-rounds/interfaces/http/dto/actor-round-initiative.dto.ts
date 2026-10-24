import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { ActorRoundInitiative } from '../../../domain/value-objects/actor-round-initiative.vo.js';

export class ActorRoundInitiativeDto {
  @ApiProperty({ description: 'Base initiative value' })
  base: number;

  @ApiProperty({ description: 'Initiative penalty' })
  penalty: number;

  @ApiProperty({ type: Number, description: 'Initiative roll' })
  @IsOptional()
  roll: number | undefined;

  @ApiProperty({ type: Number, description: 'Total initiative' })
  @IsOptional()
  total: number | undefined;

  @ApiProperty({ description: 'Strike Reflex bonus declared with the roll, already in the total', required: false, example: 20 })
  @IsOptional()
  strikeReflex?: number;

  @ApiProperty({ description: 'Reflexes effect bonus declared with the roll, already in the total', required: false, example: 15 })
  @IsOptional()
  reflexes?: number;

  static fromEntity(model: ActorRoundInitiative): ActorRoundInitiativeDto {
    const dto = new ActorRoundInitiativeDto();
    dto.base = model.base;
    dto.penalty = model.penalty;
    dto.roll = model.roll;
    dto.total = model.total;
    dto.strikeReflex = model.strikeReflex;
    dto.reflexes = model.reflexes;
    return dto;
  }
}
