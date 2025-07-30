const process = (character: any): void => {
    const baseBonus = character.statistics.qu.totalBonus;
    const customBonus = character.initiative.customBonus || 0;
    //TODO calculate
    const penaltyBonus = 0;
    const totalBonus = baseBonus + penaltyBonus + customBonus;
    character.initiative = {
        baseBonus: baseBonus,
        customBonus: customBonus,
        penaltyBonus: penaltyBonus,
        totalBonus: totalBonus
    }
};

export default {
    process,
};
