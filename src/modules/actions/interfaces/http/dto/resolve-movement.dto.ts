import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString } from 'class-validator';
import { ResolveMovementCommand } from '../../../application/cqrs/commands/resolve-movement.command';
import type { Pace } from '../../../domain/value-objects/action-movement.vo';

export class ResolveMovementRequestDto {
  @ApiProperty({ description: 'Movement completion phase', example: 2 })
  @IsNumber()
  phase: number;

  @ApiProperty({ description: 'The pace of the movement', example: 'walk' })
  @IsString()
  pace: Pace;

  @ApiProperty({ description: 'Indicates if a maneuver is required', example: true })
  @IsOptional()
  @IsBoolean()
  requiredManeuver: boolean;

  @IsString()
  @IsOptional()
  difficulty: string | undefined;

  @IsOptional()
  @IsString()
  skillId: string | undefined;

  @IsOptional()
  @IsNumber()
  roll: number | undefined;

  @IsOptional()
  @IsString()
  description: string | undefined;

  static toCommand(actionId: string, dto: ResolveMovementRequestDto, userId: string, roles: string[]): ResolveMovementCommand {
    const cmd = new ResolveMovementCommand();
    cmd.actionId = actionId;
    cmd.phase = dto.phase;
    cmd.pace = dto.pace;
    cmd.requiredManeuver = dto.requiredManeuver;
    cmd.difficulty = dto.difficulty;
    cmd.skillId = dto.skillId;
    cmd.roll = dto.roll;
    cmd.description = dto.description;
    cmd.userId = userId;
    cmd.roles = roles;
    return cmd;
  }
}
