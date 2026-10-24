import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { DeclareDefenseModeCommand } from '../../../application/cqrs/commands/declare-defense-mode.command';
import { ActorRoundDefenseMode, DEFENSE_LEVELS } from '../../../domain/value-objects/actor-round-defense-mode.vo';
import type { DefenseLevel } from '../../../domain/value-objects/actor-round-defense-mode.vo';

export class ActorRoundDefenseModeDto {
  @ApiProperty({ type: String, description: 'Dodge declared this round', enum: DEFENSE_LEVELS, example: 'none' })
  dodge: DefenseLevel;

  @ApiProperty({ type: String, description: 'Shield block declared this round', enum: DEFENSE_LEVELS, example: 'passive' })
  block: DefenseLevel;

  static fromEntity(entity: ActorRoundDefenseMode): ActorRoundDefenseModeDto {
    const dto = new ActorRoundDefenseModeDto();
    dto.dodge = entity.dodge;
    dto.block = entity.block;
    return dto;
  }
}

export class DeclareDefenseModeDto {
  @ApiProperty({
    type: String,
    description: 'Dodge (full only with a 4 AP dodge action); kept when missing',
    enum: DEFENSE_LEVELS,
    required: false,
  })
  @IsOptional()
  @IsIn(DEFENSE_LEVELS)
  dodge?: DefenseLevel;

  @ApiProperty({
    type: String,
    description: 'Shield block (full only with a 4 AP dodge action); kept when missing',
    enum: DEFENSE_LEVELS,
    required: false,
  })
  @IsOptional()
  @IsIn(DEFENSE_LEVELS)
  block?: DefenseLevel;

  static toCommand(id: string, dto: DeclareDefenseModeDto, userId: string, roles: string[]): DeclareDefenseModeCommand {
    return new DeclareDefenseModeCommand(id, dto.dodge, dto.block, userId, roles);
  }
}
