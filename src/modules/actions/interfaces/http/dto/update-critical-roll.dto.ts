import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { UpdateCriticalRollCommand } from '../../../application/cqrs/commands/update-critical-roll.command';

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

  static toCommand(actionId: string, dto: UpdateCriticalRollDto, userId: string, roles: string[]): UpdateCriticalRollCommand {
    return new UpdateCriticalRollCommand(actionId, dto.attackName, dto.criticalKey, dto.roll, userId, roles);
  }
}
