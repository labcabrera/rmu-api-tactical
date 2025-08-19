import { Injectable } from '@nestjs/common';

import { Character, CharacterSkill } from '../../../entities/character.entity';

@Injectable()
export class SkillProcessor {
  process(character: Partial<Character>): void {
    if (!character.skills || !character.statistics) {
      return;
    }
    character.skills.forEach((skill: CharacterSkill) => this.updateSkill(character, skill));
    character.skills.sort((a: CharacterSkill, b: CharacterSkill) => a.skillId.localeCompare(b.skillId));
  }

  private updateSkill(character: Partial<Character>, skill: CharacterSkill): void {
    const ranks = skill.ranks;
    const statBonus = this.getStatBonus(character, skill.statistics);
    const racialBonus = skill.racialBonus || 0;
    const developmentBonus = this.getRankBonus(ranks);
    const customBonus = skill.customBonus || 0;
    const totalBonus = statBonus + racialBonus + developmentBonus + customBonus;

    skill.statBonus = statBonus;
    skill.developmentBonus = developmentBonus;
    skill.totalBonus = totalBonus;
  }

  private getStatBonus(character: Partial<Character>, statistics: string[]): number {
    let statBonus = 0;
    statistics?.forEach((stat) => {
      const statValue = (character.statistics as any)[stat];
      if (statValue?.totalBonus) {
        statBonus += statValue.totalBonus;
      }
    });
    return statBonus;
  }

  private getRankBonus(ranks: number): number {
    return ranks > 0 ? ranks * 5 : -20;
  }
}
