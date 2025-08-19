import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional } from 'class-validator';

import { UpdateSkillCommand } from '../../../application/commands/update-skill.command';

export class UpdateSkillDto {
  @ApiProperty({ description: 'The number of ranks in the skill', example: 3 })
  @IsNumber()
  ranks: number;

  @ApiProperty({ description: 'Custom bonus applied to the skill', example: 0 })
  @IsNumber()
  @IsOptional()
  customBonus: number | undefined;

  static toCommand(characterId: string, skillId: string, dto: UpdateSkillDto, userId: string, roles: string[]) {
    return new UpdateSkillCommand(characterId, skillId, dto.ranks, dto.customBonus, userId, roles);
  }
}
