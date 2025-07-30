import express, { Request, Response, Router } from 'express';
import { CreateTacticalGameCommand } from '../../../application/commands/CreateTacticalGameCommand';
import { UpdateTacticalGameCommand } from '../../../application/commands/UpdateTacticalGameCommand';
import { TacticalGameApplicationService } from '../../../application/TacticalGameApplicationService';
import {
    TacticalGameSearchCriteria
} from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/Logger';
import { DependencyContainer } from '../../DependencyContainer';
import { ErrorHandler } from '../ErrorHandler';

export class TacticalGameController {
    private router: Router;
    private tacticalGameApplicationService: TacticalGameApplicationService;
    private logger: Logger;

    constructor() {
        this.router = express.Router();
        const container = DependencyContainer.getInstance();
        this.tacticalGameApplicationService = container.tacticalGameApplicationService;
        this.logger = container.logger;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.findTacticalGames.bind(this));
        this.router.get('/:gameId', this.findTacticalGameById.bind(this));
        this.router.post('/', this.createTacticalGame.bind(this));
        this.router.patch('/:gameId', this.updateTacticalGame.bind(this));
        this.router.delete('/:gameId', this.deleteTacticalGame.bind(this));
        this.router.post('/:tacticalGameId/rounds/start', this.startRound.bind(this));
        this.router.get('/:tacticalGameId/rounds/:round/characters', this.findTacticalCharacterRounds.bind(this));
    }

    private async findTacticalGames(req: Request, res: Response): Promise<void> {
        try {
            const searchExpression = req.query.search as string;
            const username = req.query.username as string;
            const page = req.query.page ? parseInt(req.query.page as string) : 0;
            const size = req.query.size ? parseInt(req.query.size as string) : 10;

            this.logger.info(`Search tactical << search: ${searchExpression || 'none'}, user: ${username}, page: ${page}, size: ${size}`);

            const criteria: TacticalGameSearchCriteria = {
                searchExpression,
                username,
                page,
                size
            };

            const response = await this.tacticalGameApplicationService.find(criteria);
            res.json(response);
        } catch (error) {
            this.logger.error(`Error finding tactical games: ${(error as Error).message}`);
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    private async findTacticalGameById(req: Request, res: Response): Promise<void> {
        try {
            const gameId: string = req.params.gameId!;
            this.logger.info(`Search tactical game << ${gameId}`);

            const game = await this.tacticalGameApplicationService.findById(gameId);
            this.logger.info(`Found tactical game: ${game.name}`);

            res.json(game);
        } catch (error: any) {
            this.logger.error(`Error finding tactical game ${req.params.gameId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async createTacticalGame(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Tactical game creation << ${req.body.name}`);
            //TODO JWT
            const user: string = "lab.cabrera@gmail.com";

            const command: CreateTacticalGameCommand = {
                user,
                name: req.body.name,
                description: req.body.description,
                factions: req.body.factions
            };

            const newGame = await this.tacticalGameApplicationService.create(command);
            res.status(201).json(newGame);
        } catch (error: any) {
            this.logger.error(`Error creating tactical game: ${error.message}`);
            res.status(400).json({ message: error.message });
        }
    }

    private async updateTacticalGame(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Tactical game update - ${req.params.gameId}`);
            const gameId: string = req.params.gameId!;

            const command: UpdateTacticalGameCommand = {
                name: req.body.name,
                description: req.body.description
            };

            const result = await this.tacticalGameApplicationService.update(gameId, command);
            res.json(result);
        } catch (error: any) {
            this.logger.error(`Error updating tactical game ${req.params.gameId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async deleteTacticalGame(req: Request, res: Response): Promise<void> {
        try {
            const gameId: string = req.params.gameId!;
            this.logger.info(`Tactical game deletion << ${gameId}`);

            await this.tacticalGameApplicationService.delete(gameId);
            this.logger.info(`Tactical game deleted successfully: ${gameId}`);

            res.status(204).send(); // 204 No Content for successful deletion
        } catch (error: any) {
            this.logger.error(`Error deleting tactical game ${req.params.gameId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async startRound(req: Request, res: Response): Promise<void> {
        try {
            const gameId: string = req.params.tacticalGameId!;
            this.logger.info(`Starting round for game << ${gameId}`);
            const result = await this.tacticalGameApplicationService.startRound(gameId);
            this.logger.info(`Round started successfully for game: ${gameId}`);

            res.status(200).json(result);
        } catch (error: any) {
            this.logger.error(`Error starting round for tactical game ${req.params.tacticalGameId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async findTacticalCharacterRounds(req: Request, res: Response): Promise<void> {
        try {
            const tacticalGameId: string = req.params.tacticalGameId!;
            const round: number = parseInt(req.params.round!);
            this.logger.info(`Finding character rounds << tacticalGameId: ${tacticalGameId}, round: ${round}`);
            const result = await this.tacticalGameApplicationService.findTacticalCharacterRounds(tacticalGameId, round);
            this.logger.info(`Found ${result.length} character rounds for game: ${tacticalGameId}, round: ${round}`);

            res.status(200).json(result);
        } catch (error: any) {
            this.logger.error(`Error finding character rounds for tactical game ${req.params.tacticalGameId}, round ${req.params.round}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
