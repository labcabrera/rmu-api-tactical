import { randomUUID } from 'crypto';
import { CharacterEndurance, CharacterHP, CharacterInitiative, CharacterMovement, CharacterSkill, CharacterStatistics, CreateTacticalCharacterCommand, TacticalCharacterEntity } from '../../../domain/entities/TacticalCharacter';
import { Logger } from '../../../domain/ports/Logger';
import { TacticalCharacterRepository } from '../../../domain/ports/TacticalCharacterRepository';
import { TacticalGameRepository } from '../../../domain/ports/TacticalGameRepository';
import { CharacterProcessorService } from '../../../domain/services/CharacterProcessorService';

const API_CORE_URL = 'http://localhost:3001/v1';

export class CreateTacticalCharacterUseCase {
    constructor(
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private tacticalGameRepository: TacticalGameRepository,
        private characterProcessorService: CharacterProcessorService,
        private logger: Logger
    ) { }


    async execute(command: CreateTacticalCharacterCommand): Promise<TacticalCharacterEntity> {
        this.logger.info(`CreateTacticalCharacterUseCase: Creating tactical character: ${command.name} for game: ${command.gameId}`);


        this.logger.info(`Command: ${JSON.stringify(command)}`);

        const tacticalGame = await this.tacticalGameRepository.findById(command.gameId);
        if (!tacticalGame) {
            throw new Error('Tactical game not found');
        }

        if (!command.faction) {
            throw new Error('Required faction');
        }
        if (!tacticalGame.factions.includes(command.faction)) {
            throw new Error('Invalid faction');
        }
        if (!command.info || !command.info.race) {
            throw new Error('Required race');
        }
        if (!command.endurance || !command.endurance.max) {
            throw new Error('Required endurance');
        }
        if (!command.hp || !command.hp.max) {
            throw new Error('Required HP');
        }

        const raceInfo = await this.readRaceInfo(command.info.race);
        const processedStatistics = this.processStatistics(raceInfo, command.statistics);
        const skills = await this.processSkills(command.skills);
        this.logger.info(`Processed skills: ${JSON.stringify(skills)}`);

        const strideRacialBonus = raceInfo.strideBonus;
        const strideCustomBonus = command.movement && command.movement.strideCustomBonus ? command.movement.strideCustomBonus : 0;
        const movement: CharacterMovement = {
            baseMovementRate: 0,
            strideCustomBonus: strideCustomBonus,
            strideQuBonus: 0,
            strideRacialBonus: strideRacialBonus
        };
        const defense = {
            armorType: 1,
            defensiveBonus: 0
        };
        const hp: CharacterHP = {
            max: command.hp.max,
            current: command.hp.max
        };
        const endurance: CharacterEndurance = {
            max: command.endurance.max,
            current: command.endurance.max,
            accumulator: 0,
            fatiguePenalty: 0
        }
        const power = {
            max: 0,
            current: 0
        };
        const initiative: CharacterInitiative = {
            baseBonus: 0,
            customBonus: 0,
            penaltyBonus: 0,
            totalBonus: 0
        };
        const equipment = {
            mainHand: '',
            offHand: '',
            body: '',
            head: '',
            weight: 0
        };
        const items = command.items ? command.items.map(item => ({
            id: randomUUID(),
            name: item.name,
            itemTypeId: item.itemTypeId,
            category: item.category,
            attackTable: item.attackTable,
            skillId: item.skillId
        })) : [];
        const characterData: Omit<TacticalCharacterEntity, 'id' | 'createdAt' | 'updatedAt'> = {
            gameId: command.gameId,
            name: command.name,
            faction: command.faction,
            info: command.info,
            statistics: processedStatistics,
            movement: movement,
            defense: defense,
            hp: hp,
            endurance: endurance,
            power: power,
            initiative: initiative,
            skills: skills,
            items: items,
            equipment: equipment,
        };

        this.logger.info(`Creating character: ${JSON.stringify(characterData)}`);

        const newCharacter = await this.tacticalCharacterRepository.create(characterData);
        this.characterProcessorService.process(newCharacter);
        await this.tacticalCharacterRepository.update(newCharacter.id, newCharacter);

        this.logger.info(`Tactical updated created successfully: ${newCharacter.id}`);
        return newCharacter;
    }

    async readRaceInfo(raceId: string): Promise<any> {
        try {
            const response = await fetch(`${API_CORE_URL}/races/${raceId}`);
            if (response.status != 200) {
                throw { status: 500, message: `Invalid race identifier ${raceId}` };
            }
            const responseBody = await response.json();
            return responseBody;
        } catch (error) {
            throw new Error(`Error reading race info. ${error}`);
        }
    }

    processStatistics(raceInfo: any, statistics: CharacterStatistics): CharacterStatistics {
        const values = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];
        const result: CharacterStatistics = {};
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

    async processSkills(skills: any[]): Promise<CharacterSkill[]> {
        this.logger.info(`Processing skills`);
        if (!skills || skills.length == 0) {
            return [];
        }
        const response = await fetch(`${API_CORE_URL}/skills`);
        if (response.status != 200) {
            throw { status: 500, message: 'Error reading skills' };
        }
        const responseBody = await response.json() as { content: any[] };
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
                totalBonus: totalBonus,
                specialization: e.specialization ? e.specialization : '',
                statistics: e.statistics ? e.statistics : []
            };
        });
    }
}
