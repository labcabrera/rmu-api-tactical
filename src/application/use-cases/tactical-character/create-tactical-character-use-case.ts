import { randomUUID } from 'crypto';

import {
    CharacterDefense,
    CharacterEndurance,
    CharacterEquipment,
    CharacterHP,
    CharacterInitiative,
    CharacterItem,
    CharacterMovement,
    CharacterPower,
    CharacterSkill,
    CharacterStatistics,
    CreateTacticalCharacterCommand,
    TacticalCharacter
} from '@domain/entities/tactical-character.entity';
import { TacticalGame } from '@domain/entities/tactical-game.entity';
import { Logger } from '@domain/ports/logger';
import { RaceClient } from '@domain/ports/race-client';
import { SkillClient } from '@domain/ports/skill-client';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';
import { TacticalGameRepository } from '@domain/ports/tactical-game.repository';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

const API_CORE_URL = 'http://localhost:3001/v1';

export class CreateTacticalCharacterUseCase {

    constructor(
        private raceClient: RaceClient,
        private skillClient: SkillClient,
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private tacticalGameRepository: TacticalGameRepository,
        private characterProcessorService: CharacterProcessorService,
        private logger: Logger
    ) { }


    async execute(command: CreateTacticalCharacterCommand): Promise<TacticalCharacter> {
        this.logger.info(`CreateTacticalCharacterUseCase: Creating tactical character: ${command.name} for game: ${command.gameId}`);
        this.logger.debug(`Command: ${JSON.stringify(command)}`);

        const tacticalGame = await this.tacticalGameRepository.findById(command.gameId);
        this.validateCommand(command, tacticalGame);
        const raceInfo = await this.raceClient.getRaceById(command.info.race);
        const processedStatistics = this.processStatistics(raceInfo, command.statistics);
        const skills = await this.processSkills(command.skills);
        const strideRacialBonus = raceInfo.strideBonus;
        const strideCustomBonus = command.movement && command.movement.strideCustomBonus ? command.movement.strideCustomBonus : 0;
        const movement: CharacterMovement = {
            baseMovementRate: 0,
            strideCustomBonus: strideCustomBonus,
            strideQuBonus: 0,
            strideRacialBonus: strideRacialBonus
        };
        const defense: CharacterDefense = {
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
        const power: CharacterPower = {
            max: 0,
            current: 0
        };
        const initiative: CharacterInitiative = {
            baseBonus: 0,
            customBonus: 0,
            penaltyBonus: 0,
            totalBonus: 0
        };
        const equipment: CharacterEquipment = {
            mainHand: '',
            offHand: '',
            body: '',
            head: '',
            weight: 0
        };
        const items: CharacterItem[] = command.items ? command.items.map(item => ({
            id: randomUUID(),
            name: item.name,
            itemTypeId: item.itemTypeId,
            category: item.category,
            attackTable: item.attackTable,
            skillId: item.skillId,
            info: item.info
        })) : [];
        const characterData: Omit<TacticalCharacter, 'id'> = {
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
            createdAt: new Date(),
        };

        //TODO cast characterData to TacticalCharacterEntity by assigning a temporary id
        const tempCharacter: TacticalCharacter = { id: randomUUID(), ...characterData };
        this.characterProcessorService.process(tempCharacter);
        this.loadDefaultEquipment(tempCharacter);
        Object.assign(characterData, tempCharacter);
        delete (characterData as any).id;

        const newCharacter = await this.tacticalCharacterRepository.create(characterData);
        this.logger.info(`CreateTacticalCharacterUseCase: Tactical Character created successfully: ${newCharacter.id}`);
        return newCharacter;
    }

    processStatistics(raceInfo: any, statistics: CharacterStatistics): CharacterStatistics {
        try {
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
        } catch (error) {
            this.logger.error(`Error processing statistics: ${error}`);
            throw new Error('Error processing statistics');
        }
    }

    async processSkills(skills: any[]): Promise<CharacterSkill[]> {
        try {
            this.logger.info(`Processing skills`);
            if (!skills || skills.length == 0) {
                return [];
            }
            const readedSkills: any[] = await this.skillClient.getAllSkills();
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
                    ranks: e.ranks ? e.ranks : 0,
                    statBonus: 0,
                    racialBonus: racialBonus,
                    developmentBonus: developmentBonus,
                    customBonus: customBonus,
                    totalBonus: totalBonus,
                    specialization: e.specialization ? e.specialization : '',
                    statistics: e.statistics ? e.statistics : []
                };
            });
        } catch (error) {
            this.logger.error(`Error processing skills: ${error}`);
            throw new Error('Error processing skills');
        }
    }

    loadDefaultEquipment(character: TacticalCharacter): void {
        const weapon = character.items.find(e => e.category === 'weapon');
        const shield = character.items.find(e => e.category === 'shield');
        const armor = character.items.find(e => e.category === 'armor');
        if (weapon && weapon.id) {
            character.equipment.mainHand = weapon.id;
        }
        if (shield && shield.id) {
            character.equipment.offHand = shield.id;
        }
        if (shield && shield.id) {
            character.equipment.offHand = shield.id;
        }
        if (armor && armor.id) {
            character.equipment.body = armor.id;
        }
    }

    validateCommand(command: CreateTacticalCharacterCommand, game: TacticalGame): void {
        if (!command.faction) {
            throw new Error('Required faction');
        }
        if (!game.factions.includes(command.faction)) {
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
    }
}
