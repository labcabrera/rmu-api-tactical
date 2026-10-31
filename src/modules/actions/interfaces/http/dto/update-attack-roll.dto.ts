import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { UpdateAttackRollCommand } from '../../../application/cqrs/commands/update-attack-roll.command.js';

export class UpdateAttackRollDto {
  @ApiProperty({ description: 'Attack name', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Total of the high open-ended d100', example: 15 })
  @IsNumber()
  roll: number;

  @ApiProperty({ description: 'First die, unmodified: it decides the fumble', example: 4, required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  unmodified?: number;

  static toCommand(actionId: string, dto: UpdateAttackRollDto, userId: string, roles: string[]) {
    return new UpdateAttackRollCommand(actionId, dto.attackName, dto.roll, userId, roles, dto.unmodified);
  }
}
