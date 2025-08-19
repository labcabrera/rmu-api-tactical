import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

import { AddSkillCommand } from '../../../application/commands/add-skill.command';

export class AddSkillDto {
  @ApiProperty({ description: 'Skill identifier', example: 'animal-handling' })
  @IsString()
  @IsNotEmpty()
  skillId: string;

  @ApiProperty({ description: 'Skill specialization', example: 'cats' })
  @IsString()
  @IsOptional()
  specialization: string;

  @ApiProperty({ description: 'Skill ranks', example: 1 })
  @IsNumber()
  ranks: number;

  @ApiProperty({ description: 'Custom bonus', example: 0 })
  @IsNumber()
  @IsOptional()
  customBonus: number | undefined;

  static toCommand(characterId: string, dto: AddSkillDto, userId: string, roles: string[]) {
    return new AddSkillCommand(characterId, dto.skillId, dto.specialization, dto.ranks, dto.customBonus, userId, roles);
  }
}
