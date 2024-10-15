const resolveDefenderBonus = (action, character, bonus) => {
    const bonusProcessors = {
        'db': dbProcessor,
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

const dbProcessor = (action, character) => {
    return -20;
}

module.exports = {
    resolveDefenderBonus
};