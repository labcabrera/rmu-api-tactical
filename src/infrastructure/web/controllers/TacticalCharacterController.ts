import express, { Request, Response, Router } from 'express';
import { TacticalCharacterApplicationService } from '../../../application/TacticalCharacterApplicationService';
import {
    CreateTacticalCharacterCommand,
    TacticalCharacterSearchCriteria,
    UpdateTacticalCharacterCommand
} from '../../../domain/entities/TacticalCharacter';
import { Logger } from '../../../domain/ports/Logger';
import errorService from "../../../services/error-service";
import { DependencyContainer } from '../../DependencyContainer';

interface CharacterQuery {
    search?: string;
    tacticalGameId?: string;
    page?: string;
    size?: string;
}

export class TacticalCharacterController {
    private router: Router;
    private tacticalCharacterApplicationService: TacticalCharacterApplicationService;
    private logger: Logger;

    constructor() {
        this.router = express.Router();
        const container = DependencyContainer.getInstance();
        this.tacticalCharacterApplicationService = container.tacticalCharacterApplicationService;
        this.logger = container.logger;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.findCharacters.bind(this));
        this.router.get('/:characterId', this.findCharacterById.bind(this));
        this.router.post('/', this.createCharacter.bind(this));
        this.router.patch('/:characterId', this.updateCharacter.bind(this));
        this.router.delete('/:characterId', this.deleteCharacter.bind(this));
    }

    private async findCharacters(req: Request<{}, {}, {}, CharacterQuery>, res: Response): Promise<void> {
        try {
            const searchExpression = req.query.search;
            const tacticalGameId = req.query.tacticalGameId;
            const page = req.query.page ? parseInt(req.query.page) : 0;
            const size = req.query.size ? parseInt(req.query.size) : 10;

            this.logger.info(`Search tactical characters << search: ${searchExpression || 'none'}, gameId: ${tacticalGameId}, page: ${page}, size: ${size}`);

            const criteria: TacticalCharacterSearchCriteria = {
                page,
                size
            };

            if (searchExpression) {
                criteria.searchExpression = searchExpression;
            }
            if (tacticalGameId) {
                criteria.tacticalGameId = tacticalGameId;
            }

            const response = await this.tacticalCharacterApplicationService.find(criteria);
            res.json(response);
        } catch (error) {
            this.logger.error(`TacticalCharacterController: Error finding tactical characters: ${(error as Error).message}`);
            errorService.sendErrorResponse(res, error as Error);
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
            this.logger.info(`Tactical character update - ${req.params.characterId}`);
            const characterId: string = req.params.characterId!;

            const command: UpdateTacticalCharacterCommand = {
                name: req.body.name,
                faction: req.body.faction,
                hitPoints: req.body.hitPoints,
                maxHitPoints: req.body.maxHitPoints,
                initiative: req.body.initiative,
                status: req.body.status,
                // skills: req.body.skills,
                // equipment: req.body.equipment
            };

            const result = await this.tacticalCharacterApplicationService.update(characterId, command);
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

    public getRouter(): Router {
        return this.router;
    }
}
