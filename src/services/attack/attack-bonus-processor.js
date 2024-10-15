const process = (action, bonus) => {
    const bonusProcessors = {
        'restricted-quarters': restrictedQuartersProcessor,
    };
    for (const key in bonusProcessors) {
        value = bonusProcessors[key](action);
        if (value != 0) {
            bonus.push({
                type: key,
                value: value
            });
        }
    }
};

const restrictedQuartersProcessor = (action) => {
    if (!action.attackInfo.restrictedQuarters) {
        return 0;
    }
    switch (action.attackInfo.restrictedQuarters) {
        case 'none': return 0;
        case 'close': return -25;
        case 'cramped': return -50;
        case 'tigth': return -75;
        case 'confined': return -100;
        default: throw { status: 400, message: 'Invalid restricted quarters value' };
    }
}

module.exports = {
    process
};