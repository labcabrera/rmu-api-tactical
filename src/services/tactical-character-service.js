const TacticalCharacter = require("../models/tactical-character-model")
const TacticalGame = require("../models/tactical-game-model")
const tacticalCharacterConverter = require('../converters/tactical-character-converter');
const tacticalCharacterItemService = require('./tactical-character-item-service');
const tacticalCharacterCalculations = require('./tactical-character-calculations');

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
    const strideBonus = data.movement && data.movement.strideBonus ? data.movement.strideBonus : 0;
    const bmr = tacticalCharacterCalculations.getBaseMovementRate(strideBonus, processedStatistics.qu.totalBonus);
    const movement = {
        baseMovementRate: bmr,
        strideBonus: strideBonus
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
            weight: tacticalCharacterItemService.getCharacterWeight(data)
        },
        user: user
    });
    const savedCharacter = await newCharacter.save();
    const equipedCharacter = await loadDefaultEquipment(savedCharacter);
    return tacticalCharacterConverter.toJSON(equipedCharacter);
};

const update = async (characterId, data) => {
    const current = await TacticalCharacter.findById(characterId);
    if (!current) {
        throw { state: 404, message: 'Tactical character not found' };
    }
    const update = buildCharacterUpdate(data, current);
    const updatedCharacter = await TacticalCharacter.findByIdAndUpdate(characterId, update, { new: true });
    if (!updatedCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    };
    return tacticalCharacterConverter.toJSON(updatedCharacter);
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

const buildCharacterUpdate = (data, currentCharacter) => {
    const update = {};
    if (data.name) {
        update.name = data.name;
    }
    if (data.faction) {
        update.faction = data.faction;
    }
    if (data.description) {
        update.description = data.description;
    }
    buildCharacterUpdateInfo(update, data, currentCharacter);
    buildCharacterUpdateDefense(update, data, currentCharacter);
    buildCharacterUpdateHp(update, data, currentCharacter);
    buildCharacterUpdateInitiative(update, data, currentCharacter);
    return update;
};

const buildCharacterUpdateInfo = (update, data, currentCharacter) => {
    if (data.info) {
        update.info = currentCharacter.info;
        if (data.info.level) {
            update.info.level = data.info.level;
        }
        if (data.info.race) {
            update.info.race = data.info.race;
        }
        if (data.info.sizeId) {
            update.info.sizeId = data.info.sizeId;
        }
        if (data.info.baseMovementRate) {
            update.info.baseMovementRate = data.info.baseMovementRate;
        }
    }
};

const buildCharacterUpdateDefense = (update, data, currentCharacter) => {
    if (data.defense) {
        update.defense = currentCharacter.defense;
        if (data.defense.armorType) {
            update.defense.armorType = data.defense.armorType;
        }
        if (data.defense.defensiveBonus) {
            update.defense.defensiveBonus = data.defense.defensiveBonus;
        }
    }
};

const buildCharacterUpdateHp = (update, data, currentCharacter) => {
    if (data.hp) {
        update.hp = currentCharacter.hp;
        if (data.hp.max) {
            update.hp.max = data.hp.max;
        }
        if (data.hp.current) {
            update.hp.current = data.hp.current;
        }
    }
};

const buildCharacterUpdateInitiative = (update, data, currentCharacter) => {
    if (data.initiative) {
        update.initiative = currentCharacter.initiative;
        if (data.initiative.base) {
            update.initiative.base = data.initiative.base;
        }
    }
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
        throw new {status:500, message: `Error reading race info. ${error.message}`};
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

module.exports = {
    findById,
    find,
    insert,
    update,
    addCharacterEffect,
    deleteCharacterEffect,
    setCurrentHp
};