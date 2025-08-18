import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'crypto';

import * as gameRepository from '../../../../games/application/ports/out/game.repository';
import { Game } from '../../../../games/domain/entities/game.entity';
import { ValidationError } from '../../../../shared/domain/errors';
import {
  Character,
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
} from '../../../domain/entities/character.entity';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';
import * as characterRepository from '../../ports/out/character.repository';
import * as raceClient from '../../ports/out/race-client';
import * as skillClient from '../../ports/out/skill-client';
import { CreateCharacterCommand } from '../create-character.command';

@CommandHandler(CreateCharacterCommand)
export class CreateCharacterCommandHandler implements ICommandHandler<CreateCharacterCommand, Character> {
  private readonly logger = new Logger(CreateCharacterCommandHandler.name);

  constructor(
    @Inject('RaceClient') private readonly raceClient: raceClient.RaceClient,
    @Inject('SkillClient') private readonly skillClient: skillClient.SkillClient,
    @Inject('CharacterRepository') private readonly characterRepository: characterRepository.CharacterRepository,
    @Inject('GameRepository') private readonly gameRepository: gameRepository.GameRepository,
    @Inject() private readonly characterProcessorService: CharacterProcessorService,
  ) {}

  async execute(command: CreateCharacterCommand): Promise<Character> {
    const tacticalGame = await this.gameRepository.findById(command.gameId);
    if (!tacticalGame) {
      throw new ValidationError(`Game with id ${command.gameId} not found`);
    }

    this.validateCommand(command, tacticalGame);
    const raceInfo = await this.fetchRace(command.info.race);

    const processedStatistics = this.processStatistics(raceInfo, command.statistics);
    const skills = await this.processSkills(command.skills);
    const strideRacialBonus = raceInfo.strideBonus;
    const strideCustomBonus = command.strideCustomBonus || 0;
    const movement: CharacterMovement = {
      baseMovementRate: 0,
      strideCustomBonus: strideCustomBonus,
      strideQuBonus: 0,
      strideRacialBonus: strideRacialBonus,
    };
    const defense: CharacterDefense = {
      armorType: 1,
      defensiveBonus: 0,
    };
    const hp: CharacterHP = {
      customBonus: command.hpCustomBonus || 0,
      max: 0,
      current: 0,
    };
    const endurance: CharacterEndurance = {
      customBonus: command.enduranceCustomBonus || 0,
      max: 0,
      current: 0,
      accumulator: 0,
      fatiguePenalty: 0,
    };
    const power: CharacterPower = {
      max: 0,
      current: 0,
    };
    const initiative: CharacterInitiative = {
      baseBonus: 0,
      customBonus: 0,
      penaltyBonus: 0,
      totalBonus: 0,
    };
    const equipment: CharacterEquipment = {
      mainHand: '',
      offHand: '',
      body: '',
      head: '',
      weight: 0,
    };
    const items: CharacterItem[] = command.items
      ? command.items.map((item) => ({
          id: randomUUID(),
          name: item.name,
          itemTypeId: item.itemTypeId,
          category: item.category,
          attackTable: item.attackTable,
          skillId: item.skillId,
          info: item.info,
        }))
      : [];
    const characterData: Partial<Character> = {
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
      owner: command.userId,
      createdAt: new Date(),
    };
    this.characterProcessorService.process(characterData);
    this.loadDefaultEquipment(characterData);
    const newCharacter = await this.characterRepository.save(characterData);
    return newCharacter;
  }

  processStatistics(raceInfo: any, statistics: CharacterStatistics): CharacterStatistics {
    const values = ['ag', 'co', 'em', 'in', 'me', 'pr', 'qu', 're', 'sd', 'st'];
    const result: any = {};
    values.forEach((e) => {
      let racial = 0;
      if (raceInfo && raceInfo.defaultStatBonus && raceInfo.defaultStatBonus[e]) {
        racial = raceInfo.defaultStatBonus[e];
      }
      const bonus = 0;
      let custom = 0;
      if (statistics && statistics[e] && statistics[e].custom) {
        custom = statistics[e].custom;
      }
      const total = bonus + racial + custom;
      result[e] = {
        bonus: bonus,
        racial: racial,
        custom: custom,
        totalBonus: total,
      };
    });
    return result;
  }

  async processSkills(skills: any[]): Promise<CharacterSkill[]> {
    if (!skills || skills.length == 0) {
      return [];
    }
    const readedSkills: any[] = await this.skillClient.getAllSkills();
    return skills.map((e) => {
      const readedSkill = readedSkills.find((s) => s.id == e.skillId);
      if (!readedSkill) {
        throw new ValidationError(`Invalid skill identifier '${e.skillId}'`);
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
        statistics: e.statistics ? e.statistics : [],
      };
    });
  }

  loadDefaultEquipment(character: Partial<Character>): void {
    if (!character.items || !character.equipment) {
      return;
    }
    const weapon = character.items.find((e) => e.category === 'weapon');
    const shield = character.items.find((e) => e.category === 'shield');
    const armor = character.items.find((e) => e.category === 'armor');
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

  async fetchRace(raceId: string): Promise<any> {
    try {
      const raceInfo = await this.raceClient.getRaceById(raceId);
      this.logger.debug(`Race info for character creation: ${JSON.stringify(raceInfo)}`);
      return raceInfo;
    } catch (e) {
      //TODO
      throw new ValidationError(`Race with id ${raceId} not found. ${e.message}`);
    }
  }

  validateCommand(command: CreateCharacterCommand, game: Game): void {
    if (!command.faction) {
      throw new Error('Required faction');
    }
    if (!game.factions.includes(command.faction)) {
      throw new Error('Invalid faction');
    }
    if (!command.info || !command.info.race) {
      throw new Error('Required race');
    }
  }
}
