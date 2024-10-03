
const getBaseMovementRate = (strideBonus, quBonus) => {
    const effStrideBonus = strideBonus ? strideBonus : 0;
    const effQuBonus = quBonus ? quBonus : 0;
    return 20 + effStrideBonus + effQuBonus / 2;
};

module.exports = {
    getBaseMovementRate,
}