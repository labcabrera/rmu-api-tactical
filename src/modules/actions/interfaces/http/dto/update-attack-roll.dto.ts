import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
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

  @ApiProperty({ description: 'Hit location', example: 'head', required: false })
  @IsOptional()
  @IsString()
  location: AttackLocation | undefined;

  static toCommand(actionId: string, dto: UpdateAttackRollDto, userId: string, roles: string[]) {
    return new UpdateAttackRollCommand(actionId, dto.attackName, dto.roll, dto.location, userId, roles);
  }
}
