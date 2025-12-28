import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';
import {
  ResolveMovementCommand,
  ResolveMovementModifiers,
} from '../../../application/cqrs/commands/resolve-movement.command';
import type { Pace } from '../../../domain/value-objects/action-movement.vo';
import { ManeuverDifficulty } from '../../../domain/value-objects/maneuver-dificulty.vo';
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
  skillId: string | undefined;

  @IsString()
  @IsOptional()
  difficulty: ManeuverDifficulty | undefined;

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
  roll: ActionRollDto | undefined;

  @IsOptional()
  @IsString()
  description: string | undefined;

  static toCommand(
    actionId: string,
    dto: ResolveMovementRequestDto,
    userId: string,
    roles: string[],
  ): ResolveMovementCommand {
    return new ResolveMovementCommand(
      actionId,
      ResolveMovementModifiersDto.toCommand(dto.modifiers),
      dto.roll ? dto.roll.roll : undefined,
      dto.description,
      userId,
      roles,
    );
  }
}
