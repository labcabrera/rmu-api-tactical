import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { UpdateFumbleRollCommand } from '../../../application/cqrs/commands/update-fumble-roll.command';

export class UpdateFumbleRollDto {
  @ApiProperty({ description: 'Attack name', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Fumble roll value', example: 15 })
  @IsNumber()
  roll: number;

  static toCommand(actionId: string, dto: UpdateFumbleRollDto, userId: string, roles: string[]) {
    return new UpdateFumbleRollCommand(actionId, dto.attackName, dto.roll, userId, roles);
  }
}
