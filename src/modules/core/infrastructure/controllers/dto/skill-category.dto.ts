import { ApiProperty } from '@nestjs/swagger';
import { SkillCategory } from 'src/modules/core/domain/entities/skill-category';

export class SkillCategoryDto {
  @ApiProperty({ description: 'Category name', example: 'animals' })
  id: string;

  @ApiProperty({ description: 'List of stats that apply a benefit to the skill', example: ['em', 'co'] })
  bonus: string[];

  static fromEntity(entity: SkillCategory): SkillCategoryDto {
    const dto = new SkillCategoryDto();
    dto.id = entity.id;
    dto.bonus = entity.bonus || [];
    return dto;
  }
}
