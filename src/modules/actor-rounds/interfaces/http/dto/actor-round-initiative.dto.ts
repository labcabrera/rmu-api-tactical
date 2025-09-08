import { ApiProperty } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { ActorRoundInitiative } from '../../../domain/entities/actor-round-initiative.vo';

export class ActorRoundInitiativeDto {
  @ApiProperty({ description: 'Base initiative value' })
  base: number;

  @ApiProperty({ description: 'Initiative penalty' })
  penalty: number;

  @ApiProperty({ description: 'Initiative roll' })
  @IsOptional()
  roll: number | undefined;

  @ApiProperty({ description: 'Total initiative' })
  @IsOptional()
  total: number | undefined;

  static fromEntity(model: ActorRoundInitiative): ActorRoundInitiativeDto {
    const dto = new ActorRoundInitiativeDto();
    dto.base = model.base;
    dto.penalty = model.penalty;
    dto.roll = model.roll;
    dto.total = model.total;
    return dto;
  }
}
