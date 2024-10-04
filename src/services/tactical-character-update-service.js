const TacticalCharacter = require("../models/tactical-character-model")
const tacticalCharacterConverter = require('../converters/tactical-character-converter');
const tacticalCharacterCalculations = require('./tactical-character-calculations');

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
    buildCharacterUpdateStatistics(update, data, currentCharacter);
    buildCharacterUpdateInfo(update, data, currentCharacter);
    buildCharacterUpdateDefense(update, data, currentCharacter);
    buildCharacterUpdateHp(update, data, currentCharacter);
    buildCharacterUpdateInitiative(update, data, currentCharacter);
    buildCharacterUpdateMovement(update, data, currentCharacter);
    return update;
};

const buildCharacterUpdateStatistics = (update, data, currentCharacter) => {
    if (data.statistics) {
        const values = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];
        const statUpdate = {};
        values.forEach(e => {
            const racial = currentCharacter.statistics[e].racial;
            const bonus = isDefinedStatisticVale(data, e, 'bonus') ? data.statistics[e].bonus : currentCharacter.statistics[e].bonus;
            const custom = isDefinedStatisticVale(data, e, 'custom') ? data.statistics[e].custom : currentCharacter.statistics[e].custom;
            const total = bonus + racial + custom;
            statUpdate[e] = {
                bonus: bonus,
                racial: racial,
                custom: custom,
                totalBonus: total
            }

        });
        update.statistics = statUpdate;
    }
};

const isDefinedStatisticVale = (data, statName, bonusType) => {
    if(!data.statistics || !data.statistics[statName]) {
        return false
    }
    const check = data.statistics[statName][bonusType];
    return typeof check !== 'undefined'
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

const buildCharacterUpdateMovement = (update, data, currentCharacter) => {
    if (data.movement) {
        const strideBonus = data.movement.strideBonus ? data.movement.strideBonus : currentCharacter.movement.strideBonus;
        const quBonus = currentCharacter.statistics.qu.totalBonus;
        update.movement = {
            baseMovementRate: tacticalCharacterCalculations.getBaseMovementRate(strideBonus, quBonus),
            strideBonus: strideBonus
        }
    };
};

module.exports = {
    update
};