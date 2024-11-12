const process = (character) => {
    const strideBonus = character.movement.strideCustomBonus || 0;
    const quBonus = character.statistics.qu.totalBonus;
    const baseMovementRate = getBaseMovementRate(strideBonus, quBonus);
    character.movement = {
        ...character.movement,
        baseMovementRate: baseMovementRate
    };
};

const getBaseMovementRate = (strideBonus, quBonus) => {
    const effStrideBonus = strideBonus ? strideBonus : 0;
    const effQuBonus = quBonus ? quBonus : 0;
    return 20 + effStrideBonus + effQuBonus / 2;
};

module.exports = {
    process,
}