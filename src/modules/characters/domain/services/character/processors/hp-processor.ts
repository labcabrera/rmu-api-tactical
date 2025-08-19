import { Injectable } from '@nestjs/common';
import { Character } from '../../../entities/character.entity';

@Injectable()
export class HPProcessor {
  process(character: Partial<Character>): void {
    if (!character.hp || !character.skills) {
      return;
    }
    const skill = character.skills.find((skill) => skill.skillId === 'body-development');
    if (!skill) {
      return;
    }
    const initialized = character.hp.current != 0 || character.hp.max != 0;
    if (!initialized) {
      character.hp.max = skill.totalBonus;
      character.hp.current = character.hp.max;
    } else {
      const lifeLost = character.hp.max - character.hp.current;
      character.hp.max = skill.totalBonus;
      character.hp.current = character.hp.max - lifeLost;
    }
  }
}
