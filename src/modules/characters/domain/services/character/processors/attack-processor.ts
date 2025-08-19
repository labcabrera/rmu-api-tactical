import { Injectable } from '@nestjs/common';

import { Character } from '../../../entities/character.entity';

@Injectable()
export class AttackProcessor {
  process(character: Partial<Character>): void {
    const attacks: any = {};
    this.calculateAttackBonusSlot(character, attacks, 'mainHand');
    this.calculateAttackBonusSlot(character, attacks, 'offHand');
    //TODO model refactor required
    (character as any).attacks = attacks;
  }

  private calculateAttackBonusSlot(character: Partial<Character>, attacks: any, slot: string): void {
    if (!character.items || !character.skills) {
      return;
    }
    const equipment = (character as any).equipment;
    if (equipment[slot]) {
      const item = character.items.find((e: any) => e.id == equipment[slot]);
      if (item?.weapon) {
        const skillId = item.weapon.skillId;
        const skill = character.skills.find((e: any) => e.skillId == skillId);
        const skillBonus = skill ? skill.totalBonus : -25;
        attacks[slot] = {
          bo: skillBonus,
          attackTable: item.weapon.attackTable,
        };
      }
    }
  }
}
