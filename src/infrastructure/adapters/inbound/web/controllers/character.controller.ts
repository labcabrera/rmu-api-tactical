import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';

import { Logger } from '@domain/ports/logger';

import { AddItemCommand } from '@application/commands/add-item.comand';
import { AddSkillCommand } from '@application/commands/add-skill.command';
import { CreateCharacterCommand } from '@application/commands/create-character.command';
import { DeleteSkillCommand } from '@application/commands/delete-skill-command';
import { EquipItemCommand } from '@application/commands/equip-item-command';
import { UpdateSkillCommand } from '@application/commands/update-skill.command';
import { AddItemUseCase } from '@application/use-cases/characters/add-item.usecase';
import { AddSkillUseCase } from '@application/use-cases/characters/add-skill.usecase';
import { CreateCharacterUseCase } from '@application/use-cases/characters/create-character.usecase';
import { DeleteCharacterUseCase } from '@application/use-cases/characters/delete-character.usecase';
import { DeleteItemUseCase } from '@application/use-cases/characters/delete-item.usecase';
import { DeleteSkillUseCase } from '@application/use-cases/characters/delete-skill.usecase';
import { EquipItemUseCase } from '@application/use-cases/characters/equip-item.usecase';
import { FindTCharacterByIdUseCase } from '@application/use-cases/characters/find-character-by-id.usecase';
import { FindCharactersUseCase } from '@application/use-cases/characters/find-characters.usecase';
import { UpdateCharacterUseCase } from '@application/use-cases/characters/update-character.usecase';
import { UpdateSkillUseCase } from '@application/use-cases/characters/update-skill.usecase';

import { TYPES } from '@shared/types';

export class CharacterController {
  constructor(
    @inject(TYPES.FindCharactersUseCase) private readonly findCharacterUseCase: FindCharactersUseCase,
    @inject(TYPES.FindTCharacterByIdUseCase) private readonly findCharacterByIdUseCase: FindTCharacterByIdUseCase,
    @inject(TYPES.CreateCharacterUseCase) private readonly createCharacterUseCase: CreateCharacterUseCase,
    @inject(TYPES.UpdateCharacterUseCase) private readonly updateCharacterUseCase: UpdateCharacterUseCase,
    @inject(TYPES.DeleteCharacterUseCase) private readonly deleteCharacterUseCase: DeleteCharacterUseCase,
    @inject(TYPES.AddItemUseCase) private readonly addItemUseCase: AddItemUseCase,
    @inject(TYPES.DeleteItemUseCase) private readonly deleteItemUseCase: DeleteItemUseCase,
    @inject(TYPES.EquipItemUseCase) private readonly equipItemUseCase: EquipItemUseCase,
    @inject(TYPES.AddSkillUseCase) private readonly addSkillUseCase: AddSkillUseCase,
    @inject(TYPES.UpdateSkillUseCase) private readonly updateSkillUseCase: UpdateSkillUseCase,
    @inject(TYPES.DeleteSkillUseCase) private readonly deleteSkillUseCase: DeleteSkillUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const characterId: string = req.params.characterId!;
      const character = await this.findCharacterByIdUseCase.execute(characterId);
      res.json(character);
    } catch (error) {
      next(error);
    }
  }

  async find(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 0;
      const size = req.query.size ? parseInt(req.query.size as string) : 10;
      const rsql = req.query.q as string;
      const response = await this.findCharacterUseCase.execute(rsql, page, size);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Tactical character creation << ${req.body.name}`);
      //TODO JWT
      const user: string = 'lab.cabrera@gmail.com';
      const command: CreateCharacterCommand = {
        user,
        gameId: req.body.gameId,
        faction: req.body.faction,
        statistics: req.body.statistics,
        movement: req.body.movement,
        name: req.body.name,
        info: req.body.info,
        endurance: req.body.endurance,
        hp: req.body.hp,
        skills: req.body.skills,
        items: req.body.items,
      };
      const createdCharacter = await this.createCharacterUseCase.execute(command);
      res.status(201).json(createdCharacter);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Tactical character update << ${req.params.characterId}`);
      const characterId: string = req.params.characterId!;
      const command = {
        characterId,
        ...req.body,
      };
      const result = await this.updateCharacterUseCase.execute(command);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Tactical character deletion << ${req.params.characterId}`);
      const characterId: string = req.params.characterId!;
      await this.deleteCharacterUseCase.execute(characterId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Adding item to character << ${req.params.characterId}`);
      const command: AddItemCommand = {
        characterId: req.params.characterId!,
        item: req.body,
      };
      const character = await this.addItemUseCase.execute(command);
      res.json(character);
    } catch (error) {
      next(error);
    }
  }

  async deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Deleting item from character << ${req.params.characterId}`);
      const characterId: string = req.params.characterId!;
      const itemId: string = req.params.itemId!;
      const character = await this.deleteItemUseCase.execute(characterId, itemId);
      res.json(character);
    } catch (error) {
      next;
    }
  }

  async equipItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Equipping item to character << ${req.params.characterId}`);
      const command: EquipItemCommand = {
        characterId: req.params.characterId!,
        itemId: req.body.itemId!,
        slot: req.body.slot!,
      };
      const character = await this.equipItemUseCase.execute(command);
      res.json(character);
    } catch (error) {
      next(error);
    }
  }

  async addSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Adding skill to character << ${req.params.characterId}`);
      const command: AddSkillCommand = {
        characterId: req.params.characterId!,
        skillId: req.body.skillId!,
        specialization: req.body.specialization,
        ranks: req.body.ranks!,
        customBonus: req.body.customBonus,
      };
      const character = await this.addSkillUseCase.execute(command);
      res.json(character);
    } catch (error) {
      next(error);
    }
  }

  async updateSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Updating skill for character << ${req.params.characterId}`);
      const command: UpdateSkillCommand = {
        characterId: req.params.characterId!,
        skillId: req.params.skillId!,
        ranks: req.body.ranks,
        customBonus: req.body.customBonus,
      };
      const character = await this.updateSkillUseCase.execute(command);
      res.json(character);
    } catch (error) {
      next(error);
    }
  }

  async deleteSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`TacticalCharacterController: Deleting skill for character << ${req.params.characterId}`);
      const command: DeleteSkillCommand = {
        characterId: req.params.characterId!,
        skillId: req.params.skillId!,
      };
      const character = await this.deleteSkillUseCase.execute(command);
      res.json(character);
    } catch (error) {
      next(error);
    }
  }
}
