import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { UpdateFumbleRollCommand } from '../../../application/cqrs/commands/update-fumble-roll.command.js';

export class UpdateFumbleRollDto {
  @ApiProperty({ description: 'Attack name', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Fumble roll value', example: 15 })
  @IsNumber()
  fumbleRoll: number;

  @ApiProperty({
    description: 'Sum of the dice of the fumble hits (`2d10`...); tactical rolls them when left out',
    required: false,
    example: 7,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  fumbleHits?: number;

  static toCommand(actionId: string, dto: UpdateFumbleRollDto, userId: string, roles: string[]) {
    return new UpdateFumbleRollCommand(actionId, dto.attackName, dto.fumbleRoll, userId, roles, dto.fumbleHits);
  }
}
