const process = (character: any): void => {
    const attacks: any = {};
    calculateAttackBonusSlot(character, attacks, 'mainHand');
    calculateAttackBonusSlot(character, attacks, 'offHand');
    character.attacks = attacks;
};

const calculateAttackBonusSlot = (character: any, attacks: any, slot: string): void => {
    if (character.equipment[slot]) {
        const item = character.items.find((e: any) => e.id == character.equipment[slot]);
        const skillId = item.weapon.skillId;
        const skill = character.skills.find((e: any) => e.skillId == skillId);
        const skillBonus = skill ? skill.totalBonus : -25;
        attacks[slot] = {
            bo: skillBonus,
            attackTable: item.weapon.attackTable,
        };
    }
};

export default {
    process,
};
