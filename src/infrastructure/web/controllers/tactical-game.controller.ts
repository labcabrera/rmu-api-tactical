import express, { Request, Response, Router } from 'express';
import { CreateTacticalGameCommand } from '../../../application/commands/create-tactical-game.command';
import { UpdateTacticalGameCommand } from '../../../application/commands/update-tactical-game-command';
import { CreateTacticalGameUseCase } from '../../../application/use-cases/tactical-game/create-tactical-game-use-case';
import { DeleteTacticalGameUseCase } from '../../../application/use-cases/tactical-game/delete-tactical-game-use-case';
import { FindTacticalGameByIdUseCase } from '../../../application/use-cases/tactical-game/find-tactical-game-by-id-use-case';
import { FindTacticalGamesUseCase } from '../../../application/use-cases/tactical-game/find-tactical-games-use-case';
import { StartRoundUseCase } from '../../../application/use-cases/tactical-game/start-round-use-case';
import { UpdateTacticalGameUseCase } from '../../../application/use-cases/tactical-game/update-tactical-game-use-case';
import { Logger } from '../../../domain/ports/logger';
import { TacticalGameQuery } from '../../../domain/queries/tactical-game.query';
import { DependencyContainer } from '../../dependency-container';
import { ErrorHandler } from '../error-handler';

export class TacticalGameController {

    private router: Router;
    private readonly findUseCase: FindTacticalGamesUseCase;
    private readonly findByIdUseCase: FindTacticalGameByIdUseCase;
    private readonly createUseCase: CreateTacticalGameUseCase;
    private readonly updateUseCase: UpdateTacticalGameUseCase;
    private readonly deleteUseCase: DeleteTacticalGameUseCase;
    private readonly startRoundUseCase: StartRoundUseCase;
    
    private logger: Logger;

    constructor() {
        this.router = express.Router();
        const container = DependencyContainer.getInstance();
        this.findUseCase = container.findTacticalGamesUseCase;
        this.findByIdUseCase = container.findTacticalGameByIdUseCase;
        this.createUseCase = container.createTacticalGameUseCase;
        this.updateUseCase = container.updateTacticalGameUseCase;
        this.deleteUseCase = container.deleteTacticalGameUseCase;
        this.startRoundUseCase = container.startRoundUseCase;
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
    }

    private async findTacticalGames(req: Request, res: Response): Promise<void> {
        try {
            const username = req.query.username as string;
            const searchExpression = req.query.search as string;
            const page = req.query.page ? parseInt(req.query.page as string) : 0;
            const size = req.query.size ? parseInt(req.query.size as string) : 10;
            const query: TacticalGameQuery = {
                searchExpression: searchExpression,
                username: username,
                page: page,
                size: size};
            const response = await this.findUseCase.execute(query);
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
            const game = await this.findByIdUseCase.execute(gameId);
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
            const newGame = await this.createUseCase.execute(command);
            res.status(201).json(newGame);
        } catch (error: any) {
            this.logger.error(`Error creating tactical game: ${error.message}`);
            res.status(400).json({ message: error.message });
        }
    }

    private async updateTacticalGame(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Tactical game update - ${req.params.gameId}`);
            const command: UpdateTacticalGameCommand = {
                gameId: req.params.gameId!,
                name: req.body.name,
                description: req.body.description
            };
            const result = await this.updateUseCase.execute(command);
            res.json(result);
        } catch (error: any) {
            this.logger.error(`Error updating tactical game ${req.params.gameId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async deleteTacticalGame(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`Tactical game deletion << ${req.params.gameId}`);
            const gameId: string = req.params.gameId!;
            await this.deleteUseCase.execute(gameId);
            res.status(204).send();
        } catch (error: any) {
            this.logger.error(`Error deleting tactical game ${req.params.gameId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async startRound(req: Request, res: Response): Promise<void> {
        try {
            this.logger.info(`TacticalGameController: Starting round for game << ${req.params.tacticalGameId}`);
            const gameId: string = req.params.tacticalGameId!;
            const result = await this.startRoundUseCase.execute(gameId);
            res.json(result);
        } catch (error: any) {
            this.logger.error(`TacticalGameController: Error starting round for tactical game ${req.params.tacticalGameId}: ${error.message}`);
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
