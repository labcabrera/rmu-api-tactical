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
    //TODO read skill and load data
    if(current.skills.some(e => e.skillId == data.skillId)) {
        throw { status: 400, message: 'Character already has the selected skill' };
    }
    const newSkill = {
        skillId: data.skillId,
        bonus: data.bonus ? data.bonus : 0
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

const deleteSkill = async (characterId, skillId) => {
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $pull: { skills: { skillId: skillId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

module.exports = {
    addSkill,
    deleteSkill
};