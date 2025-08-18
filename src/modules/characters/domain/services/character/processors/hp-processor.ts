import { Character } from '../../../entities/character.entity';

export class HPProcessor {
  static process(character: Partial<Character>): void {
    if (!character.hp) {
      return;
    }
    const hp = character.hp;
    const skill = character.skills!.find((skill) => skill.skillId === 'body-development');
    const skillBonus = skill ? skill.totalBonus : 0;
    const max = hp.racialBonus + hp.customBonus + skillBonus;
    //TODO size adjustment
    hp.skillBonus = skillBonus;
    hp.max = max;
  }
}
