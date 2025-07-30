const process = (character: any): void => {
    character.skills.forEach((skill: any) => updateSkill(character, skill));
};

const updateSkill = (character: any, skill: any): void => {
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

const getStatBonus = (character: any, statistics: string[]): number => {
    let statBonus = 0;
    statistics.forEach(e => {
        statBonus += character.statistics[e].totalBonus;
    });
    return statBonus;
};

const getRankBonus = (ranks: number): number => {
    return ranks > 0 ? ranks * 5 : -20;
};

export default {
    process,
};
