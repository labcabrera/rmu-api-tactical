import { Injectable } from '@nestjs/common';
import { SkillCategoryRepository } from 'src/modules/core/application/ports/outbound/skill-category-repository';
import { SKILL_CATEGORIES, SkillCategory } from 'src/modules/core/domain/entities/skill-category';

@Injectable()
export class InMemorySkillCategoryRepository implements SkillCategoryRepository {
  findById(id: string): SkillCategory | null {
    const skillCategory = SKILL_CATEGORIES.find((sc) => sc.id === id);
    return skillCategory || null;
  }

  find(): SkillCategory[] {
    return SKILL_CATEGORIES;
  }
}
