import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { DeclareInitiativeCommand } from '../../../application/cqrs/commands/declare-initiative.command.js';

export class DeclareInitiativeDto {
  constructor(roll: number, strikeReflex?: boolean) {
    this.roll = roll;
    this.strikeReflex = strikeReflex;
  }

  @ApiProperty({ description: 'Initiative roll (2-20)' })
  @IsNumber()
  roll: number;

  @ApiProperty({
    description: 'A sudden movement in reach triggers the Strike Reflex talent (+20); only for actors with it',
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  strikeReflex?: boolean;

  static toCommand(id: string, dto: DeclareInitiativeDto, userId: string, roles: string[]): DeclareInitiativeCommand {
    return new DeclareInitiativeCommand(id, dto.roll, userId, roles, dto.strikeReflex ?? false);
  }
}
