const toJSON = (character) => {
    return {
        id: character._id,
        tacticalGameId: character.tacticalGameId,
        name: character.name,
        faction: character.faction,
        info: character.info,
        statistics: character.statistics,
        movement: character.movement,
        defense: character.defense,
        hp: character.hp,
        endurance: character.endurance,
        power: character.power,
        initiative: character.initiative,
        effects: character.effects.map(mapEffect),
        skills: character.skills.map(mapSkill),
        items: character.items.map(mapItem),
        equipment: character.equipment,
        description: character.description,
        createdAt: character.createdAt,
        updatedAt: character.updatedAt
    };
};

const mapEffect = (effect) => {
    return {
        id: effect._id,
        type: effect.type,
        vale: effect.vale,
        rounds: effect.rounds
    }
};

const mapSkill = (skill) => {
    return {
        id: skill._id,
        skillCategoryId: skill.skillCategoryId,
        skillId: skill.skillId,
        attributeBonus: skill.attributeBonus,
        racialBonus: skill.racialBonus,
        developmentBonus: skill.developmentBonus,
        customBonus: skill.customBonus,
        totalBonus: skill.totalBonus
    }
};

const mapItem = (item) => {
    return {
        id: item._id,
        itemTypeId: item.itemTypeId,
        name: item.name,
        weapon: item.weapon,
        weaponRange: item.weaponRange,
        info: item.info
    }
};

module.exports = {
    toJSON
};