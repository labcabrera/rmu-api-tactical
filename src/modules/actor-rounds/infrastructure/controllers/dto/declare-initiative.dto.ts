import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { DeclareInitiativeCommand } from '../../../application/commands/declare-initiative.command';

export class DeclareInitiativeDto {
  @ApiProperty({ description: 'Initiative roll' })
  @IsNumber()
  roll: number;

  static toCommand(id: string, dto: DeclareInitiativeDto, userId: string, roles: string[]): DeclareInitiativeCommand {
    return new DeclareInitiativeCommand(id, dto.roll, userId, roles);
  }
}
