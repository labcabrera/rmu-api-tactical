import { ApiProperty } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
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

  @ApiProperty({
    description: 'The die of the closed d100 roll (spec 076): when sent, it must be the roll (err-roll-open-ended-invalid)',
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsInt({ each: true })
  dice?: number[];

  static toCommand(actionId: string, dto: UpdateFumbleRollDto, userId: string, roles: string[]) {
    return new UpdateFumbleRollCommand(actionId, dto.attackName, dto.fumbleRoll, userId, roles, dto.fumbleHits, dto.dice);
  }
}
