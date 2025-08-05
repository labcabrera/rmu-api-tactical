import express, { NextFunction, Request, Response, Router } from "express";
import { inject } from 'inversify';

import { Logger } from '@domain/ports/logger';
import { CharacterQuery } from "@domain/queries/character.query";

import { AddItemCommand } from "@application/commands/add-item.comand";
import { AddSkillCommand } from "@application/commands/add-skill.command";
import { CreateCharacterCommand } from "@application/commands/create-character.command";
import { DeleteSkillCommand } from "@application/commands/delete-skill-command";
import { EquipItemCommand } from "@application/commands/equip-item-command";
import { UpdateSkillCommand } from "@application/commands/update-skill.command";
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
  private router: Router;

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
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", this.findCharacters.bind(this));
    this.router.get("/:characterId", this.findCharacterById.bind(this));
    this.router.post("/", this.createCharacter.bind(this));
    this.router.patch("/:characterId", this.updateCharacter.bind(this));
    this.router.delete("/:characterId", this.deleteCharacter.bind(this));
    this.router.post("/:characterId/items", this.addItem.bind(this));
    this.router.delete(
      "/:characterId/items/:itemId",
      this.deleteItem.bind(this),
    );
    this.router.post("/:characterId/equipment", this.equipItem.bind(this));
    this.router.post("/:characterId/skills", this.addSkill.bind(this));
    this.router.patch(
      "/:characterId/skills/:skillId",
      this.updateSkill.bind(this),
    );
    this.router.delete(
      "/:characterId/skills/:skillId",
      this.deleteSkill.bind(this),
    );
  }

  private async findCharacters(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query: CharacterQuery = {
        searchExpression: req.params.search as string,
        gameId: req.params.gameId as string,
        page: req.params.page ? parseInt(req.params.page) : 0,
        size: req.params.size ? parseInt(req.params.size) : 10,
      };
      const response = await this.findCharacterUseCase.execute(query);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  private async findCharacterById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const characterId: string = req.params.characterId!;
      const character =
        await this.findCharacterByIdUseCase.execute(characterId);
      res.json(character);
    } catch (error) {
      next(error);
    }
  }

  private async createCharacter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Tactical character creation << ${req.body.name}`,
      );
      //TODO JWT
      const user: string = "lab.cabrera@gmail.com";
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
      const createdCharacter =
        await this.createCharacterUseCase.execute(command);
      res.status(201).json(createdCharacter);
    } catch (error) {
      next(error);
    }
  }

  private async updateCharacter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Tactical character update << ${req.params.characterId}`,
      );
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

  private async deleteCharacter(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Tactical character deletion << ${req.params.characterId}`,
      );
      const characterId: string = req.params.characterId!;
      await this.deleteCharacterUseCase.execute(characterId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  private async addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Adding item to character << ${req.params.characterId}`,
      );
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

  private async deleteItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Deleting item from character << ${req.params.characterId}`,
      );
      const characterId: string = req.params.characterId!;
      const itemId: string = req.params.itemId!;
      const character = await this.deleteItemUseCase.execute(
        characterId,
        itemId,
      );
      res.json(character);
    } catch (error) {
      next
    }
  }

  private async equipItem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Equipping item to character << ${req.params.characterId}`,
      );
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

  private async addSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Adding skill to character << ${req.params.characterId}`,
      );
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

  private async updateSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Updating skill for character << ${req.params.characterId}`,
      );
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

  private async deleteSkill(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `TacticalCharacterController: Deleting skill for character << ${req.params.characterId}`,
      );
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

  public getRouter(): Router {
    return this.router;
  }
}
