import { Character } from "../../../entities/character.entity";

export class AttackProcessor {
  static process(character: Character): void {
    const attacks: any = {};
    this.calculateAttackBonusSlot(character, attacks, "mainHand");
    this.calculateAttackBonusSlot(character, attacks, "offHand");
    (character as any).attacks = attacks;
  }

  private static calculateAttackBonusSlot(
    character: Character,
    attacks: any,
    slot: string,
  ): void {
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
