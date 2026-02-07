import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';
import { AddEffectsCommand } from '../../../application/cqrs/commands/add-effects.command';

export class AddHpDto {
  constructor(dmg: number) {
    this.dmg = dmg;
  }

  @ApiProperty({ description: 'HP to add or subtract' })
  @IsNumber()
  dmg: number;

  static toCommand(id: string, dto: AddHpDto, userId: string, userRoles: string[]): AddEffectsCommand {
    return new AddEffectsCommand(id, dto.dmg, [], undefined, userId, userRoles);
  }
}
