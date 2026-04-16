import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import { ResolveMovementCommand, ResolveMovementModifiers } from '../../../application/cqrs/commands/resolve-movement.command';
import type { Pace } from '../../../domain/value-objects/action-movement.vo';
import { Difficulty } from '../../../domain/value-objects/dificulty.vo';
import { ActionRollDto } from './action-roll.dto';

export class ResolveMovementModifiersDto {
  @ApiProperty({ description: 'The pace of the movement', example: 'walk' })
  @IsString()
  pace: Pace;

  @ApiProperty({ description: 'Indicates if a maneuver is required', example: true })
  @IsOptional()
  @IsBoolean()
  requiredManeuver: boolean;

  @IsOptional()
  @IsString()
  skillId: string;

  @IsString()
  @IsOptional()
  difficulty: Difficulty | null;

  static toCommand(dto: ResolveMovementModifiersDto): ResolveMovementModifiers {
    return new ResolveMovementModifiers(dto.pace, dto.requiredManeuver, dto.skillId, dto.difficulty);
  }
}

export class ResolveMovementRequestDto {
  @ApiProperty({ description: 'Movement completion phase', example: 2 })
  @IsObject()
  modifiers: ResolveMovementModifiersDto;

  @IsOptional()
  @IsObject()
  roll: ActionRollDto | null;

  @IsOptional()
  @IsString()
  description: string | null;

  static toCommand(actionId: string, dto: ResolveMovementRequestDto, userId: string, roles: string[]): ResolveMovementCommand {
    return new ResolveMovementCommand(
      actionId,
      ResolveMovementModifiersDto.toCommand(dto.modifiers),
      dto.roll?.roll || null,
      dto.description,
      userId,
      roles,
    );
  }
}
