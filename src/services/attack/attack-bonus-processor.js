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
    //TODO
    return -5;
}

module.exports = {
    process
};