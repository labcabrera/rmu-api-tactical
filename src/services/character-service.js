const TacticalCharacter = require("../models/tactical-character-model.js")
const TacticalGame = require("../models/tactical-game-model.js")

const itemService = require('./items/item-service.js');
const tacticalCharacterConverter = require('../converters/tactical-character-converter.js');
const characterProcessor = require('./character-processor-service.js');

//TODO
const API_CORE_URL = 'http://localhost:3001/v1';

const findById = async (characterId) => {
    const readed = await TacticalCharacter.findById(characterId);
    if (!readed) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(readed);
};

const find = async (searchExpression, tacticalGameId, page, size) => {
    let filter = {};
    if (tacticalGameId) {
        filter.tacticalGameId = tacticalGameId;
    }
    const skip = page * size;
    const list = await TacticalCharacter.find(filter).skip(skip).limit(size).sort({ updatedAt: -1 });
    const count = await TacticalCharacter.countDocuments(filter);
    const content = list.map(tacticalCharacterConverter.toJSON);
    return { content: content, pagination: { page: page, size: size, totalElements: count } };
}

const insert = async (user, data) => {
    const tacticalGame = await TacticalGame.findById(data.tacticalGameId);
    if (!tacticalGame) {
        throw { status: 400, message: "Tactical game not found" };
    }
    if (!data.faction) {
        throw { status: 400, message: "Required faction" };
    }
    if (!tacticalGame.factions.includes(data.faction)) {
        throw { status: 400, message: "Invalid faction" };
    }

    if (!data.info || !data.info.race) throw { status: 400, message: 'Required race' };
    if (!data.endurance || !data.endurance.max) throw { status: 400, message: 'Required endurance' };
    if (!data.hp || !data.hp.max) throw { status: 400, message: 'Required HP' };

    const raceInfo = await readRaceInfo(data.info.race);
    const processedStatistics = processStatistics(raceInfo, data.statistics);
    const processedSkills = await processSkills(data.skills);
    const endurance = {
        max: data.endurance.max,
        current: data.endurance.current ? data.endurance.current : data.endurance.max,
        accumulator: data.endurance.accumulator ? data.endurance.accumulator : 0,
        fatiguePenalty: data.endurance.fatiguePenalty ? data.endurance.fatiguePenalty : 0,
    };
    const strideRacialBonus = raceInfo.strideBonus;
    const strideCustomBonus = data.movement && data.movement.strideCustomBonus ? data.movement.strideCustomBonus : 0;
    const movement = {
        baseMovementRate: 0,
        strideCustomBonus: strideCustomBonus,
        strideQuBonus: 0,
        strideRacialBonus: strideRacialBonus
    };
    const hp = {
        max: data.hp.max,
        current: data.hp.current ? data.hp.current : data.hp.max
    };
    const powerMax = data.power && data.power.max ? data.power.max : 0;
    const powerCurrent = data.power && data.power.current ? data.power.current : powerMax;
    const power = {
        max: powerMax,
        current: powerCurrent
    };
    const initiativeBaseBonus = processedStatistics.qu.totalBonus;
    const initiativeCustomBonus = data.initiative && data.initiative.customBonus ? data.initiative.customBonus : 0
    const initiative = {
        baseBonus: initiativeBaseBonus,
        customBonus: initiativeCustomBonus,
        penaltyBonus: 0,
        totalBonus: initiativeBaseBonus + initiativeCustomBonus
    };
    const newCharacter = new TacticalCharacter({
        name: data.name,
        tacticalGameId: data.tacticalGameId,
        faction: data.faction,
        info: data.info,
        statistics: processedStatistics,
        movement: movement,
        defense: data.defense,
        hp: hp,
        endurance: endurance,
        power: power,
        initiative: initiative,
        skills: processedSkills,
        items: data.items,
        description: data.description,
        equipment: {
            mainHand: null,
            offHand: null,
            head: null,
            body: null,
            weight: itemService.getCharacterWeight(data)
        },
        user: user
    });
    const savedCharacter = await newCharacter.save();   
    characterProcessor.process(savedCharacter);
    await TacticalCharacter.updateOne({ _id: savedCharacter._id }, savedCharacter);
    const equipedCharacter = await loadDefaultEquipment(savedCharacter);
    return tacticalCharacterConverter.toJSON(equipedCharacter);
};

const addCharacterEffect = async (characterId, data) => {
    const { type, value, rounds } = data;
    const effects = { type: type, value: value, rounds: rounds };
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $push: { effects: effects } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
};

const deleteCharacterEffect = async (characterId, effectId) => {
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { $pull: { effects: { _id: effectId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return toJSON(updatedCharacter);
};

const setCurrentHp = async (characterId, hp) => {
    const readedCharacter = await TacticalCharacter.findById(characterId);
    if (!readedCharacter) {
        throw { status: 400, message: "Character not found" };
    }
    const maxHp = readedCharacter.hp.max;
    const currentHp = readedCharacter.hp.current;
    if (hp > maxHp) {
        throw { status: 400, message: "Value (" + hp + ") exceeds the character's maximum life points (" + maxHp + ")" };
    } else if (hp === currentHp) {
        throw { status: 304, message: "Not modified" };
    }
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(
        characterId,
        { hp: { max: maxHp, current: hp } },
        { new: true });
    return toJSON(updatedCharacter);
};


const loadDefaultEquipment = async (character) => {
    const weapons = character.items.filter(e => e.category === 'weapon');
    const shields = character.items.filter(e => e.category === 'shield');
    character.equipment.mainHand = weapons.length > 0 ? weapons[0].id : null;
    if (shields.length > 0) {
        character.equipment.offHand = shields.length > 0 ? shields[0].id : null;
    } else if (weapons.length > 1) {
        character.equipment.offHand = weapons.length > 0 ? weapons[1].id : null;
    }
    const armor = character.items.find(e => e.category === 'armor');
    if (armor) {
        character.equipment.body = armor.id;
    }
    return character.save();
};

const processSkills = async (skills) => {
    if (!skills || skills.length == 0) {
        return [];
    }
    const response = await fetch(`${API_CORE_URL}/skills`);
    if (response.status != 200) {
        throw { status: 500, message: 'Error reading skills' };
    }
    const responseBody = await response.json();
    const readedSkills = responseBody.content;
    return skills.map(e => {
        const readedSkill = readedSkills.find(s => s.id == e.skillId);
        if (!readedSkill) {
            throw { status: 500, message: `Invalid skill identifier '${e.skillId}'` };
        }
        //TODO
        const attributeBonus = 0;
        const racialBonus = 0;
        const developmentBonus = 0;
        const customBonus = e.customBonus ? e.customBonus : 0;
        const totalBonus = attributeBonus + racialBonus + developmentBonus + customBonus;
        return {
            skillId: readedSkill.id,
            skillCategoryId: readedSkill.categoryId,
            attributeBonus: attributeBonus,
            ranks: 0,
            statBonus: 0,
            racialBonus: racialBonus,
            developmentBonus: developmentBonus,
            customBonus: customBonus,
            totalBonus: totalBonus
        };
    });
};

const readRaceInfo = async (raceId) => {
    try {
        const response = await fetch(`${API_CORE_URL}/races/${raceId}`);
        if (response.status != 200) {
            throw { status: 500, message: `Invalid race identifier ${raceId}` };
        }
        const responseBody = await response.json();
        return responseBody;
    } catch (error) {
        throw new { status: 500, message: `Error reading race info. ${error.message}` };
    }
};

const processStatistics = (raceInfo, statistics) => {
    const values = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];
    const result = {};
    values.forEach(e => {
        var racial = 0;
        if (raceInfo && raceInfo.defaultStatBonus && raceInfo.defaultStatBonus[e]) {
            racial = raceInfo.defaultStatBonus[e];
        }
        const bonus = 0;
        var custom = 0;
        if (statistics && statistics[e] && statistics[e].custom) {
            custom = statistics[e].custom;
        }
        const total = bonus + racial + custom;
        result[e] = {
            bonus: bonus,
            racial: racial,
            custom: custom,
            totalBonus: total
        }

    });
    return result;
};

const executeCharacterProcessors = (character) => {
    

}

module.exports = {
    findById,
    find,
    insert,
    addCharacterEffect,
    deleteCharacterEffect,
    setCurrentHp
};