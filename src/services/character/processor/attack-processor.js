const process = (character) => {
    const attacks = {};
    calculateAttackBonusSlot(character, attacks, 'mainHand');
    calculateAttackBonusSlot(character, attacks, 'offHand');
    character.attacks = attacks;
};

const calculateAttackBonusSlot = (character, attacks, slot) => {
    if (character.equipment[slot]) {
        const item = character.items.find(e => e.id == character.equipment[slot]);
        const skillId = item.weapon.skillId;
        const skill = character.skills.find(e => e.skillId == skillId);
        const skillBonus = skill ? skill.totalBonus : -25;
        attacks[slot] = {
            bo: skillBonus,
            attackTable: item.weapon.attackTable,
        };
    }
};

module.exports = {
    process,
}