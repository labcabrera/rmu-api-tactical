import { Skill } from 'src/modules/core/domain/entities/skill';

export interface SkillRepository {
  findById(id: string): Skill | null;

  findAll(): Skill[];

  findByCategory(categoryId: string): Skill[];
}
