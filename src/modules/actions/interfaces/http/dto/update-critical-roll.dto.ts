import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { CRITICAL_STYLE_OPTIONS } from '../../../domain/services/style-critical-option.js';
import { UpdateCriticalRollCommand } from '../../../application/cqrs/commands/update-critical-roll.command.js';

export class UpdateCriticalRollDto {
  @ApiProperty({ description: 'Attack name', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Critical key', example: 's_b_1' })
  @IsString()
  @IsNotEmpty()
  criticalKey: string;

  @ApiProperty({ description: 'Attack roll value', example: 15 })
  @IsNumber()
  roll: number;

  @ApiProperty({
    description: 'Fighting style ability decided before rolling the critical (workspace spec 032)',
    required: false,
    enum: CRITICAL_STYLE_OPTIONS,
  })
  @IsOptional()
  @IsIn(CRITICAL_STYLE_OPTIONS)
  styleOption?: string;

  static toCommand(actionId: string, dto: UpdateCriticalRollDto, userId: string, roles: string[]): UpdateCriticalRollCommand {
    return new UpdateCriticalRollCommand(actionId, dto.attackName, dto.criticalKey, dto.roll, userId, roles, dto.styleOption);
  }
}
