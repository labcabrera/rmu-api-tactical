const TacticalCharacter = require("../models/tactical-character-model")
const tacticalCharacterConverter = require('../converters/tactical-character-converter');

const addSkill = async (characterId, data) => {
    const current = await TacticalCharacter.findById(characterId);
    if (!current) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    if (!data.skillId) {
        throw { status: 400, message: 'Required skillId' };
    }
    const readedSkill = await fetchSkill(data.skillId);
    if (current.skills.some(e => e.skillId == data.skillId)) {
        throw { status: 400, message: 'Character already has the selected skill' };
    }
    //TODO resolve bonus
    const newSkill = {
        skillCategoryId: readedSkill.categoryId,
        skillId: data.skillId,
        attributeBonus: data.attributeBonus ? data.attributeBonus : 0,
        racialBonus: data.racialBonus ? data.racialBonus : 0,
        developmentBonus: data.developmentBonus ? data.developmentBonus : 0,
        customBonus: data.customBonus ? data.customBonus : 0
    };
    newSkill.totalBonus = newSkill.attributeBonus + newSkill.racialBonus + newSkill.developmentBonus + newSkill.customBonus;
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $push: { skills: newSkill } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const deleteSkill = async (characterId, skillId) => {
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $pull: { skills: { skillId: skillId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const fetchSkill = async (skillId) => {
    //TODO env url
    const url = `http://localhost:3001/v1/skills/${skillId}`;
    const response = await fetch(url);
    switch (response.status) {
        case 200:
            return await response.json();
        case 404:
            throw { status: 404, message: 'Skill not found' };
        default:
            throw { status: 500, message: `Error reading skill` };
    }
};

module.exports = {
    addSkill,
    deleteSkill
};