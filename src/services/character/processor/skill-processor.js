const process = (character) => {
    character.skills.forEach(skill => updateSkill(character, skill));
};

const updateSkill = async (character, skill) => {
    const ranks = skill.ranks;
    const statBonus = getStatBonus(character, skill.statistics);
    const racialBonus = skill.racialBonus;
    const developmentBonus = getRankBonus(ranks);
    const customBonus = skill.customBonus;
    const totalBonus = statBonus + racialBonus + developmentBonus + customBonus;

    skill.statBonus = statBonus;
    skill.developmentBonus = developmentBonus;
    skill.totalBonus = totalBonus;
};

const getStatBonus = (character, statistics) => {
    var statBonus = 0;
    statistics.forEach(e => {
        statBonus += character.statistics[e].totalBonus;
    });
    return statBonus;
};

const getRankBonus = (ranks) => {
    return ranks > 0 ? ranks * 5 : -20;
};

module.exports = {
    process,
}