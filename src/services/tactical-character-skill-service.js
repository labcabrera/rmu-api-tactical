const TacticalCharacter = require("../models/tactical-character-model")
const tacticalCharacterConverter = require('../converters/tactical-character-converter');

//TODO env
const APP_CORE_URL = 'http://localhost:3001/v1';

const addSkill = async (characterId, data) => {
    validateAddSkillData(data);
    const currentCharacter = await TacticalCharacter.findById(characterId);
    if (!currentCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    const readedSkill = await fetchSkill(data.skillId);
    if (currentCharacter.skills.some(e => e.skillId == data.skillId)) {
        throw { status: 400, message: 'Character already has the selected skill' };
    }
    const readedSkillCategory = await fetchSkillCategory(readedSkill.categoryId);
    const statistics = getSkillStatistics(readedSkillCategory, readedSkill);
    const ranks = data.ranks ? data.ranks : 0;
    const specialization = data.specialization ? data.specialization : null;
    const statBonus = getStatBonus(currentCharacter, statistics);
    const racialBonus = 0;
    const developmentBonus = ranks > 0 ? 5 * ranks : -20;
    const customBonus = data.customBonus ? data.customBonus : 0;
    const totalBonus = statBonus + racialBonus + developmentBonus + customBonus;
    const newSkill = {
        skillId: data.skillId,
        specialization: specialization,
        statistics: statistics,
        ranks: ranks,
        statBonus: statBonus,
        racialBonus: racialBonus,
        developmentBonus: developmentBonus,
        customBonus: customBonus,
        totalBonus: totalBonus
    };
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $push: { skills: newSkill } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const updateSkill = async (characterId, skillId, data) => {
    if (!skillId) {
        throw { status: 404, message: 'Required skillId' };
    }
    const currentCharacter = await TacticalCharacter.findById(characterId);
    if (!currentCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    const currentSkill = currentCharacter.skills.find(e => e.skillId == skillId);
    if (!currentSkill) {
        throw { status: 404, message: 'Invalid skill' };
    }
    const ranks = data.ranks ? data.ranks : currentSkill.ranks;   
    const statBonus = currentSkill.statBonus;
    const racialBonus = currentSkill.racialBonus;
    const developmentBonus = getRankBonus(ranks);
    const customBonus = data.customBonus ? data.customBonus : currentSkill.customBonus;
    const totalBonus = statBonus + racialBonus + developmentBonus + customBonus;
    const updatedCharacter = await TacticalCharacter.updateOne(
        {
            _id: characterId,
            'skills.skillId': skillId
        },
        {
            $set: {
                'skills.$.ranks': ranks,
                'skills.$.customBonus': customBonus,
                'skills.$.totalBonus': totalBonus
            }
        }
    );
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const deleteSkill = async (characterId, skillId) => {
    const currentCharacter = await TacticalCharacter.findById(characterId);
    if (!currentCharacter.skills.some(e => e.skillId === skillId)) {
        throw { status: 400, message: 'Missing skill' };
    }
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $pull: { skills: { skillId: skillId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const getRankBonus = (ranks) => {
    return ranks > 0 ? ranks * 5 : -20;
};

const getSkillStatistics = (skillCategory, skill) => {
    const statistics = skillCategory.bonus;
    statistics.push(skill.bonus[0]);
    return statistics;
}

const getStatBonus = (character, statistics) => {
    var statBonus = 0;
    statistics.forEach(e => {
        statBonus += character.statistics[e].totalBonus;
    });
    return statBonus;
};

const validateAddSkillData = (data) => {
    if (!data.skillId) throw { status: 400, message: 'Required skillId' };
};

const fetchSkill = async (skillId) => {
    const response = await fetch(`${APP_CORE_URL}/skills/${skillId}`);
    switch (response.status) {
        case 200:
            return await response.json();
        case 404:
            throw { status: 404, message: 'Skill not found' };
        default:
            throw { status: 500, message: `Error reading skill` };
    }
};

const fetchSkillCategory = async (categoryId) => {
    const response = await fetch(`${APP_CORE_URL}/skill-categories/${categoryId}`);
    switch (response.status) {
        case 200:
            return await response.json();
        case 404:
            throw { status: 500, message: 'Invalid skill category' };
        default:
            throw { status: 500, message: `Error reading skill category` };
    }
};

module.exports = {
    addSkill,
    updateSkill,
    deleteSkill
};