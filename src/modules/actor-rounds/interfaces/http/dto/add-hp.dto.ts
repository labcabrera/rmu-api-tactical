import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { AdjustHpCommand } from '../../../application/cqrs/commands/adjust-hp.command.js';

export class AddHpDto {
  constructor(dmg: number) {
    this.dmg = dmg;
  }

  @ApiProperty({ description: 'Hits taken (positive) or healed (negative), up to the maximum' })
  @IsNumber()
  dmg: number;

  static toCommand(id: string, dto: AddHpDto, userId: string, userRoles: string[]): AdjustHpCommand {
    return new AdjustHpCommand(id, dto.dmg, userId, userRoles);
  }
}
