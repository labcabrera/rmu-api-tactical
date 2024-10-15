const process = (action, character, attackMode, bonus) => {
    const bonusProcessors = {
        'bo': boProcessor,
        'action-points-penalty': actionPointsPenaltyProcessor
    };
    for (const key in bonusProcessors) {
        value = bonusProcessors[key](action, character);
        if (value != 0) {
            bonus.push({
                type: key,
                value: value
            });
        }
    }
};

const boProcessor = (action, character, attackMode) => {
    return 50;
};

const actionPointsPenaltyProcessor = (action, character) => {
    switch (action.actionPoints) {
        case 1: return -75;
        case 2: return -50;
        case 3: return -25;
        default: return 0;
    }
};

const resolveAttackWeapon = (action, character, attackMode) => {
    var item = null;
    switch (attackMode) {
        case 'mainHand':
            const itemId = character.equipment.mainHand;
            item = character.items.find(i => i.id === itemId);
            break;
    }
    if (action.attackInfo.weapon) {
        return action.attackInfo.weapon;
    }
    return character.mainHand;
};

module.exports = {
    process
};