import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { UpdateAttackRollCommand } from '../../../application/cqrs/commands/update-attack-roll.command';
import { AttackLocation } from '../../../domain/value-objects/attack-location.vo';

export class UpdateAttackRollDto {
  @ApiProperty({ description: 'Attack name', example: 'mainHand' })
  @IsString()
  @IsNotEmpty()
  attackName: string;

  @ApiProperty({ description: 'Attack roll value', example: 15 })
  @IsNumber()
  roll: number;

  location: AttackLocation | undefined;

  static toCommand(actionId: string, dto: UpdateAttackRollDto, userId: string, roles: string[]) {
    return new UpdateAttackRollCommand(actionId, dto.attackName, dto.roll, dto.location, userId, roles);
  }
}
