import express, { Request, Response, Router } from 'express';
import { CharacterAddItemCommand } from '../../../application/commands/add-item.comand';
import { EquipItemCommand } from '../../../application/commands/equip-item-command';
import { TacticalCharacterApplicationService } from '../../../application/tactical-character-application.service';
import { AddItemUseCase } from '../../../application/use-cases/tactical-character/add-item-use-case';
import { DeleteItemUseCase } from '../../../application/use-cases/tactical-character/delete-item-use-case';
import { CharacterEquipItemUseCase } from '../../../application/use-cases/tactical-character/equip-item-use-case';
import { FindTacticalCharactersUseCase } from '../../../application/use-cases/tactical-character/find-tactical-character-use-case';
import {
    CreateTacticalCharacterCommand
} from '../../../domain/entities/tactical-character.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterQuery } from '../../../domain/queries/tactical-character.query';
import { DependencyContainer } from '../../dependency-container';
import { ErrorHandler } from '../ErrorHandler';

interface CharacterQuery {
    search?: string;
    tacticalGameId?: string;
    page?: string;
    size?: string;
}

export class TacticalCharacterController {
    private router: Router;
    private tacticalCharacterApplicationService: TacticalCharacterApplicationService;
    private findCharacterUseCase: FindTacticalCharactersUseCase;
    private addItemUseCase: AddItemUseCase;
    private deleteItemUseCase: DeleteItemUseCase;
    private equipItemUseCase: CharacterEquipItemUseCase;
    private logger: Logger;

    constructor() {
        this.router = express.Router();
        const container = DependencyContainer.getInstance();
        this.tacticalCharacterApplicationService = container.tacticalCharacterApplicationService;
        this.findCharacterUseCase = container.findTacticalCharacterUseCase;
        this.addItemUseCase = container.addItemUseCase;
        this.deleteItemUseCase = container.deleteItemUseCase;
        this.equipItemUseCase = container.equipItemUseCase;
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
    }

    private async findCharacters(req: Request<{}, {}, {}, CharacterQuery>, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalCharacterController: Finding tactical characters << ${JSON.stringify(req.query)}`);
            const searchExpression = req.query.search as string;
            const tacticalGameId = req.query.tacticalGameId as string;
            const page = req.query.page ? parseInt(req.query.page) : 0;
            const size = req.query.size ? parseInt(req.query.size) : 10;
            this.logger.info(`Search tactical characters << search: ${searchExpression || 'none'}, gameId: ${tacticalGameId}, page: ${page}, size: ${size}`);
            const query: TacticalCharacterQuery = {
                searchExpression: searchExpression,
                tacticalGameId: tacticalGameId,
                page: page,
                size: size
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
            const characterId: string = req.params.characterId!;
            this.logger.info(`Search tactical character << ${characterId}`);

            const character = await this.tacticalCharacterApplicationService.findById(characterId);
            this.logger.info(`Found tactical character: ${character.name}`);

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
            const newCharacter = await this.tacticalCharacterApplicationService.create(command);
            res.status(201).json(newCharacter);
        } catch (error: any) {
            this.logger.error(`Error creating tactical character: ${error.message}`);
            res.status(400).json({ message: error.message });
        }
    }

    private async updateCharacter(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Tactical character update << ${req.params.characterId} ${req.body}`);
            const characterId: string = req.params.characterId!;
            const command: CharacterAddItemCommand = {
                characterId,
                item: req.body
            };
            const result = await this.addItemUseCase.execute(command);
            res.json(result);
        } catch (error: any) {
            this.logger.error(`Error updating tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async deleteCharacter(req: Request, res: Response): Promise<void> {
        try {
            const characterId: string = req.params.characterId!;
            this.logger.info(`Tactical character deletion << ${characterId}`);

            await this.tacticalCharacterApplicationService.delete(characterId);
            this.logger.info(`Tactical character deleted successfully: ${characterId}`);

            res.status(204).send(); // 204 No Content for successful deletion
        } catch (error: any) {
            this.logger.error(`Error deleting tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async addItem(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Adding item to character << ${req.params.characterId}`);
            const command: CharacterAddItemCommand = {
                characterId: req.params.characterId!,
                item: req.body
            };
            const character = await this.addItemUseCase.execute(command);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`Error adding item to tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async deleteItem(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Deleting item from character << ${req.params.characterId}`);
            const characterId: string = req.params.characterId!;
            const itemId: string = req.params.itemId!;
            const character = await this.deleteItemUseCase.execute(characterId, itemId);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`Error adding item to tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async equipItem(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Equipping item to character << ${req.params.characterId}`);
            const command: EquipItemCommand = {
                characterId: req.params.characterId!,
                itemId: req.body.itemId!,
                slot: req.body.slot!
            };
            const character = await this.equipItemUseCase.execute(command);
            res.json(character);
        } catch (error: any) {
            this.logger.error(`Error equipping item to tactical character ${req.params.characterId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
