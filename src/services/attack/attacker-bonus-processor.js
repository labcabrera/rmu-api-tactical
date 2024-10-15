const process = (action, character, bonus) => {
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

const boProcessor = (action, character) => {
    //TODO
    return 50;
}

const actionPointsPenaltyProcessor = (action, character) => {
    switch (action.actionPoints) {
        case 1: return -75;
        case 2: return -50;
        case 3: return -25;
        default: return 0;
    }
}

module.exports = {
    process
};