import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

import { PrepareAttackCommand } from '../../../application/commands/prepare-attack.command';

export class PrepareAttackDto {
  @ApiProperty({ description: 'Type of the attack being prepared', example: 'main_hand' })
  @IsString()
  @IsNotEmpty()
  attackType: string;

  static toCommand(actionId: string, dto: PrepareAttackDto, userId: string, userRoles: string[]): PrepareAttackCommand {
    const result = new PrepareAttackCommand();
    result.actionId = actionId;
    result.attackType = dto.attackType;
    result.userId = userId;
    result.roles = userRoles;
    return result;
  }
}
