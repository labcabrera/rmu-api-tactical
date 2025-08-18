import { Injectable } from '@nestjs/common';
import { SkillRepository } from 'src/modules/core/application/ports/outbound/skill-repository';
import { Skill, RMU_SKILLS } from 'src/modules/core/domain/entities/skill';

@Injectable()
export class InMemorySkillRepository implements SkillRepository {
  findById(id: string): Skill | null {
    const skill = RMU_SKILLS.find((skill) => skill.id === id);
    return skill || null;
  }
  findAll(): Skill[] {
    return RMU_SKILLS;
  }

  findByCategory(categoryId: string): Skill[] {
    const filteredSkills = RMU_SKILLS.filter((skill) => {
      if (categoryId && skill.categoryId !== categoryId) {
        return false;
      }
      return true;
    });
    return filteredSkills;
  }
}
