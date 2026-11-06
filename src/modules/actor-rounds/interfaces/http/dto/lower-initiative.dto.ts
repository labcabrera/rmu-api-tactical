import { ApiProperty } from '@nestjs/swagger';
import { IsInt } from 'class-validator';
import { LowerInitiativeCommand } from '../../../application/cqrs/commands/lower-initiative.command.js';

export class LowerInitiativeDto {
  @ApiProperty({ description: 'New total initiative: lower than the current one, down to its value in negative', example: 5 })
  @IsInt()
  total: number;

  static toCommand(id: string, dto: LowerInitiativeDto, userId: string, roles: string[]): LowerInitiativeCommand {
    return new LowerInitiativeCommand(id, dto.total, userId, roles);
  }
}
