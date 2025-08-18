import { ApiProperty } from '@nestjs/swagger';
import { Skill } from 'src/modules/core/domain/entities/skill';

export class SkillDto {
  @ApiProperty({ description: 'Unique identifier of the skill', example: 'animal-handling' })
  id: string;

  @ApiProperty({ description: 'Category of the skill', example: 'animal' })
  categoryId: string;

  @ApiProperty({ description: 'List of stats that apply a benefit to the skill', example: ['em', 'co'] })
  bonus: string[];

  @ApiProperty({ description: 'List of specializations for the skill', example: ['stealth', 'tracking'] })
  specializations: string[];

  static fromEntity(entity: Skill): SkillDto {
    const dto = new SkillDto();
    dto.id = entity.id;
    dto.bonus = entity.bonus || [];
    dto.specializations = entity.specializations || [];
    return dto;
  }
}
