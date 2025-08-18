import { SkillCategory } from 'src/modules/core/domain/entities/skill-category';

export interface SkillCategoryRepository {
  findById(id: string): SkillCategory | null;

  find(): SkillCategory[];
}
