const process = (character) => {
    const customStrideBonus = character.movement.strideCustomBonus || 0;
    const racialStriceBonus = character.movement.strideRacialBonus || 0;
    const quBonus = character.statistics.qu.totalBonus / 2;
    
    const baseMovementRate = 20 + racialStriceBonus + customStrideBonus + quBonus;
    character.movement = {
        ...character.movement,
        strideQuBonus: quBonus,
        baseMovementRate: baseMovementRate
    };
};

module.exports = {
    process,
}