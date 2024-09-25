const toJSON = (character) => {
    return {
        id: character._id,
        tacticalGameId: character.tacticalGameId,
        name: character.name,
        faction: character.faction,
        info: {
            level: character.info.level,
            race: character.info.race,
            sizeId: character.info.sizeId,
            armorType: character.info.armorType
        },
        hp: {
            max: character.hp.max,
            current: character.hp.current
        },
        initiative: character.initiative,
        effects: character.effects.map(mapEffect),
        skills: character.skills.map(mapSkill),
        items: character.items.map(mapItem),
        equipment: {
            mainHand: character.equipment.mainHand,
            offHand: character.equipment.offHand,
            head: character.equipment.head,
            body: character.equipment.body
        },
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
        skillId: skill.skillId,
        bonus: skill.bonus
    }
};

const mapItem = (item) => {
    return {
        id: item._id,
        name: item.name,
        category: item.category,
        itemTypeId: item.itemTypeId,
        attackTable: item.attackTable,
        skillId: item.skillId
    }
};

module.exports = {
    toJSON
};