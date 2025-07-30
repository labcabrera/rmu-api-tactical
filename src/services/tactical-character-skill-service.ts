import tacticalCharacterConverter from '../converters/tactical-character-converter';
import TacticalCharacterDocument from "../infrastructure/adapters/persistence/models/tactical-character-model";

//TODO env
const APP_CORE_URL = 'http://localhost:3001/v1';

interface SkillData {
    skillId: string;
    ranks?: number;
    specialization?: string;
    customBonus?: number;
}

interface Skill {
    skillId: string;
    specialization?: string | null;
    statistics: string[];
    ranks: number;
    statBonus: number;
    racialBonus: number;
    developmentBonus: number;
    customBonus: number;
    totalBonus: number;
}

const addSkill = async (characterId: string, data: SkillData): Promise<any> => {
    validateAddSkillData(data);
    const currentCharacter = await TacticalCharacterDocument.findById(characterId);
    if (!currentCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    const readedSkill = await fetchSkill(data.skillId);
    if (currentCharacter.skills?.some((e: any) => e.skillId == data.skillId)) {
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
    const newSkill: Skill = {
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
    const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(
        characterId,
        { $push: { skills: newSkill } },
        { new: true });
    if (!updatedCharacter) {
        throw { message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const updateSkill = async (characterId: string, skillId: string, data: SkillData): Promise<any> => {
    if (!skillId) {
        throw { status: 404, message: 'Required skillId' };
    }
    const currentCharacter = await TacticalCharacterDocument.findById(characterId);
    if (!currentCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    const currentSkill = currentCharacter.skills?.find((e: any) => e.skillId == skillId);
    if (!currentSkill) {
        throw { status: 404, message: 'Invalid skill' };
    }
    const ranks = data.ranks ? data.ranks : (currentSkill as any).ranks;
    const statBonus = (currentSkill as any).statBonus;
    const racialBonus = (currentSkill as any).racialBonus;
    const developmentBonus = getRankBonus(ranks);
    const customBonus = data.customBonus ? data.customBonus : (currentSkill as any).customBonus;
    const totalBonus = statBonus + racialBonus + developmentBonus + customBonus;
    const updatedCharacter = await TacticalCharacterDocument.findOneAndUpdate(
        {
            _id: characterId,
            'skills.skillId': skillId
        },
        {
            $set: {
                'skills.$.ranks': ranks,
                'skills.$.customBonus': customBonus,
                'skills.$.developmentBonus': developmentBonus,
                'skills.$.totalBonus': totalBonus
            }
        },
        { new: true }
    );
    if (!updatedCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const deleteSkill = async (characterId: string, skillId: string): Promise<any> => {
    const currentCharacter = await TacticalCharacterDocument.findById(characterId);
    if (!currentCharacter?.skills?.some((e: any) => e.skillId === skillId)) {
        throw { status: 400, message: 'Missing skill' };
    }
    const updatedCharacter = await TacticalCharacterDocument.findByIdAndUpdate(
        characterId,
        { $pull: { skills: { skillId: skillId } } },
        { new: true });
    if (!updatedCharacter) {
        throw { status: 404, message: 'Tactical character not found' };
    }
    return tacticalCharacterConverter.toJSON(updatedCharacter);
};

const getRankBonus = (ranks: number): number => {
    return ranks > 0 ? ranks * 5 : -20;
};

const getSkillStatistics = (skillCategory: any, skill: any): string[] => {
    const statistics = skillCategory.bonus;
    statistics.push(skill.bonus[0]);
    return statistics;
}

const getStatBonus = (character: any, statistics: string[]): number => {
    let statBonus = 0;
    statistics.forEach(e => {
        statBonus += character.statistics[e].totalBonus;
    });
    return statBonus;
};

const validateAddSkillData = (data: SkillData): void => {
    if (!data.skillId) throw { status: 400, message: 'Required skillId' };
};

const fetchSkill = async (skillId: string): Promise<any> => {
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

const fetchSkillCategory = async (categoryId: string): Promise<any> => {
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

export default {
    addSkill,
    updateSkill,
    deleteSkill
};
