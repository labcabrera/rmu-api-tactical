import tacticalCharacterConverter from '../converters/tactical-character-converter';
import TacticalCharacterDocument from "../models/tactical-character-model";
import { TacticalCharacterModel } from '../types';
import characterProcessor from './character-processor-service';

interface CharacterUpdateData {
    name?: string;
    faction?: string;
    description?: string;
    statistics?: any;
    info?: any;
    defense?: any;
    hp?: any;
    endurance?: any;
    power?: any;
    initiative?: any;
    movement?: any;
}

const update = async (characterId: string, data: CharacterUpdateData): Promise<any> => {
    const current = await TacticalCharacterDocument.findById(characterId);
    if (!current) {
        throw { state: 404, message: 'Tactical character not found' };
    }
    const updateData = buildCharacterUpdate(data, current);
    const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(characterId, updateData, { new: true });
    if (!updatedCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    characterProcessor.process(updatedCharacter);
    await TacticalCharacterDocument.updateOne({ _id: updatedCharacter._id }, updatedCharacter);
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const buildCharacterUpdate = (data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): any => {
    const update: any = {};
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
    buildCharacterEnduranceHp(update, data, currentCharacter);
    buildCharacterUpdatePower(update, data, currentCharacter);
    buildCharacterUpdateInitiative(update, data, currentCharacter);
    buildCharacterUpdateMovement(update, data, currentCharacter);
    return update;
};

const buildCharacterUpdateStatistics = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.statistics) {
        const values = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];
        const statUpdate: any = {};
        values.forEach(e => {
            const racial = (currentCharacter as any).statistics[e].racial;
            const bonus = isDefinedStatisticVale(data, e, 'bonus') ? data.statistics[e].bonus : (currentCharacter as any).statistics[e].bonus;
            const custom = isDefinedStatisticVale(data, e, 'custom') ? data.statistics[e].custom : (currentCharacter as any).statistics[e].custom;
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

const isDefinedStatisticVale = (data: CharacterUpdateData, statName: string, bonusType: string): boolean => {
    if (!data.statistics || !data.statistics[statName]) {
        return false
    }
    const check = data.statistics[statName][bonusType];
    return typeof check !== 'undefined'
};

const buildCharacterUpdateInfo = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.info) {
        update.info = (currentCharacter as any).info;
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

const buildCharacterUpdateDefense = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.defense) {
        update.defense = (currentCharacter as any).defense;
        if (data.defense.armorType) {
            update.defense.armorType = data.defense.armorType;
        }
        if (data.defense.defensiveBonus) {
            update.defense.defensiveBonus = data.defense.defensiveBonus;
        }
    }
};

const buildCharacterUpdateHp = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.hp) {
        update.hp = (currentCharacter as any).hp;
        if (data.hp.max) {
            update.hp.max = data.hp.max;
        }
        if (data.hp.current) {
            update.hp.current = data.hp.current;
        }
    }
};

const buildCharacterEnduranceHp = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.endurance) {
        update.endurance = (currentCharacter as any).endurance;
        if (data.endurance.max) {
            update.endurance.max = data.endurance.max;
        }
        if (data.endurance.current) {
            update.endurance.current = data.endurance.current;
        }
        if (data.endurance.accumulator) {
            update.endurance.accumulator = data.endurance.accumulator;
        }
        if (data.endurance.fatiguePenalty) {
            update.endurance.fatiguePenalty = data.endurance.fatiguePenalty;
        }
    }
};

const buildCharacterUpdatePower = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.power) {
        update.power = (currentCharacter as any).power;
        if (data.power.max) {
            update.power.max = data.power.max;
        }
        if (data.power.current) {
            update.power.current = data.power.current;
        }
    }
};

const buildCharacterUpdateInitiative = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.initiative) {
        update.initiative = (currentCharacter as any).initiative;
        if (data.initiative.base) {
            update.initiative.base = data.initiative.base;
        }
    }
};

const buildCharacterUpdateMovement = (update: any, data: CharacterUpdateData, currentCharacter: TacticalCharacterModel): void => {
    if (data.movement && typeof data.movement.strideCustomBonus !== 'undefined') {
        update.movement = {
            strideCustomBonus: data.movement.strideCustomBonus,
            strideRacialBonus: (currentCharacter as any).movement?.strideRacialBonus || 0
        }
    }
};

export default {
    update
};
