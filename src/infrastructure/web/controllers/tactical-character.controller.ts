import express, { Request, Response, Router } from 'express';

import {
    CreateTacticalCharacterCommand
} from '@domain/entities/tactical-character.entity';
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterQuery } from '@domain/queries/tactical-character.query';

import { CharacterAddItemCommand } from '../../../application/commands/add-item.comand';
import { AddSkillCommand } from '../../../application/commands/add-skill.command';
import { DeleteSkillCommand } from '../../../application/commands/delete-skill-command';
import { EquipItemCommand } from '../../../application/commands/equip-item-command';
import { UpdateSkillCommand } from '../../../application/commands/update-skill.command';
import { AddItemUseCase } from '../../../application/use-cases/tactical-character/add-item-use-case';
import { AddSkillUseCase } from '../../../application/use-cases/tactical-character/add-skill-use-case';
import { CreateTacticalCharacterUseCase } from '../../../application/use-cases/tactical-character/create-tactical-character-use-case';
import { DeleteItemUseCase } from '../../../application/use-cases/tactical-character/delete-item-use-case';
import { DeleteSkillUseCase } from '../../../application/use-cases/tactical-character/delete-skill-use-case';
import { DeleteTacticalCharacterUseCase } from '../../../application/use-cases/tactical-character/delete-tactical-character-use-case';
import { EquipItemUseCase } from '../../../application/use-cases/tactical-character/equip-item-use-case';
import { FindTacticalCharacterByIdUseCase } from '../../../application/use-cases/tactical-character/find-tactical-character-by-id-use-case';
import { FindTacticalCharactersUseCase } from '../../../application/use-cases/tactical-character/find-tactical-character-use-case';
import { UpdateSkillUseCase } from '../../../application/use-cases/tactical-character/update-skill-use-case';
import { UpdateTacticalCharacterUseCase } from '../../../application/use-cases/tactical-character/update-tactical-character-use-case';
import { DependencyContainer } from '../../dependency-container';
import { ErrorHandler } from '../error-handler';

export class TacticalCharacterController {

    private router: Router;
    private findCharacterUseCase: FindTacticalCharactersUseCase;
    private findCharacterByIdUseCase: FindTacticalCharacterByIdUseCase;
    private createCharacterUseCase: CreateTacticalCharacterUseCase;
    private updateCharacterUseCase: UpdateTacticalCharacterUseCase;
    private deleteCharacterUseCase: DeleteTacticalCharacterUseCase;
    private addItemUseCase: AddItemUseCase;
    private deleteItemUseCase: DeleteItemUseCase;
    private equipItemUseCase: EquipItemUseCase;
    private addSkillUseCase: AddSkillUseCase
    private updateSkillUseCase: UpdateSkillUseCase;
    private deleteSkillUseCase: DeleteSkillUseCase;
    private logger: Logger;

    constructor() {
        this.router = express.Router();
        const container = DependencyContainer.getInstance();
        this.findCharacterUseCase = container.findTacticalCharacterUseCase;
        this.findCharacterByIdUseCase = container.findTacticalCharacterByIdUseCase;
        this.createCharacterUseCase = container.createTacticalCharacterUseCase;
        this.updateCharacterUseCase = container.updateTacticalCharacterUseCase;
        this.deleteCharacterUseCase = container.deleteTacticalCharacterUseCase;
        this.addItemUseCase = container.addItemUseCase;
        this.deleteItemUseCase = container.deleteItemUseCase;
        this.equipItemUseCase = container.equipItemUseCase;
        this.addSkillUseCase = container.addSkillUseCase;
        this.updateSkillUseCase = container.updateSkillUseCase;
        this.deleteSkillUseCase = container.deleteSkillUseCase;
        this.logger = container.logger;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.findCharacters.bind(this));
        this.router.get('/:characterId', this.findCharacterById.bind(this));
        this.router.post('/', this.createCharacter.bind(this));
        this.router.patch('/:characterId', this.updateCharacter.bind(this));
        this.router.delete('/:characterId', this.deleteCharacter.bind(this));
        this.router.post('/:characterId/items', this.addItem.bind(this));
        this.router.delete('/:characterId/items/:itemId', this.deleteItem.bind(this));
        this.router.post('/:characterId/equipment', this.equipItem.bind(this));
        this.router.post('/:characterId/skills', this.addSkill.bind(this));
        this.router.delete('/:characterId/skills/:skillId', this.deleteSkill.bind(this));
    }

    private async findCharacters(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Finding tactical characters`);
            const query: TacticalCharacterQuery = {
                searchExpression: req.params.search as string,
                tacticalGameId: req.params.tacticalGameId as string,
                page: req.params.page ? parseInt(req.params.page) : 0,
                size: req.params.size ? parseInt(req.params.size) : 10
            };
            const response = await this.findCharacterUseCase.execute(query);
            res.json(response);
        } catch (error) {
            this.logger.error(`TacticalCharacterController: Error finding tactical characters: ${(error as Error).message}`);
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    private async findCharacterById(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Search tactical character << ${req.params.characterId}`);
            const characterId: string = req.params.characterId!;
            const character = await this.findCharacterByIdUseCase.execute(characterId);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`Error finding tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async createCharacter(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Tactical character creation << ${req.body.name}`);
            //TODO JWT
            const user: string = "lab.cabrera@gmail.com";
            const command: CreateTacticalCharacterCommand = {
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
                items: req.body.items
            };
            const createdCharacter = await this.createCharacterUseCase.execute(command);
            res.status(201).json(createdCharacter);
        } catch (error: any) {
            this.logger.error(`TacticalCharacterController: Error creating tactical character: ${error.message}`);
            res.status(400).json({ message: error.message });
        }
    }

    private async updateCharacter(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Tactical character update << ${req.params.characterId}`);
            const characterId: string = req.params.characterId!;
            const command = {
                characterId,
                ...req.body
            }
            const result = await this.updateCharacterUseCase.execute(command);
            res.json(result);
        } catch (error: any) {
            this.logger.error(`TacticalCharacterController: Error updating tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async deleteCharacter(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Tactical character deletion << ${req.params.characterId}`);
            const characterId: string = req.params.characterId!;
            await this.deleteCharacterUseCase.execute(characterId);
            res.status(204).send();
        } catch (error: any) {
            this.logger.error(`TacticalCharacterController: Error deleting tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async addItem(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Adding item to character << ${req.params.characterId}`);
            const command: CharacterAddItemCommand = {
                characterId: req.params.characterId!,
                item: req.body
            };
            const character = await this.addItemUseCase.execute(command);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`TacticalCharacterController: Error adding item to tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async deleteItem(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Deleting item from character << ${req.params.characterId}`);
            const characterId: string = req.params.characterId!;
            const itemId: string = req.params.itemId!;
            const character = await this.deleteItemUseCase.execute(characterId, itemId);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`TacticalCharacterController: Error adding item to tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async equipItem(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Equipping item to character << ${req.params.characterId}`);
            const command: EquipItemCommand = {
                characterId: req.params.characterId!,
                itemId: req.body.itemId!,
                slot: req.body.slot!
            };
            const character = await this.equipItemUseCase.execute(command);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`TacticalCharacterController: Error equipping item to tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async addSkill(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Adding skill to character << ${req.params.characterId}`);
            const command: AddSkillCommand = {
                characterId: req.params.characterId!,
                skillId: req.body.skillId!,
                specialization: req.body.specialization,
                ranks: req.body.ranks!,
                customBonus: req.body.customBonus
            }
            const character = await this.addSkillUseCase.execute(command);
            res.json(character);
        }catch (error: any) {
            this.logger.error(`Error adding skill to tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async updateSkill(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Updating skill for character << ${req.params.characterId}`);
            const command: UpdateSkillCommand = {
                characterId: req.params.characterId!,
                skillId: req.params.skillId!,
                ranks: req.body.ranks,
                customBonus: req.body.customBonus
            }
            const character = await this.updateSkillUseCase.execute(command);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`Error updating skill for tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async deleteSkill(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Deleting skill for character << ${req.params.characterId}`);
            const command: DeleteSkillCommand = {
                characterId: req.params.characterId!,
                skillId: req.params.skillId!
            }
            const character = await this.deleteSkillUseCase.execute(command);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`Error deleting skill for tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
