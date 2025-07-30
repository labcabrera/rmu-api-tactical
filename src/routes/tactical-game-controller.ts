import express, { Request, Response, Router } from 'express';
import { TacticalGameApplicationService } from '../application/TacticalGameApplicationService';
import {
    CreateTacticalGameCommand,
    TacticalGameSearchCriteria,
    UpdateTacticalGameCommand
} from '../domain/entities/TacticalGame';
import { Logger } from '../domain/ports/Logger';
import { DependencyContainer } from '../infrastructure/DependencyContainer';
import errorService from "../services/error-service";

const router: Router = express.Router();
const container = DependencyContainer.getInstance();
const tacticalGameApplicationService: TacticalGameApplicationService = container.tacticalGameApplicationService;
const logger: Logger = container.logger;

router.get('/', async (req: Request, res: Response) => {
    try {
        const searchExpression = req.query.search as string;
        const username = req.query.username as string;
        const page = req.query.page ? parseInt(req.query.page as string) : 0;
        const size = req.query.size ? parseInt(req.query.size as string) : 10;
        logger.info(`Search tactical << search: ${searchExpression || 'none'}, user: ${username}, page: ${page}, size: ${size}`);
        const criteria: TacticalGameSearchCriteria = {
            searchExpression,
            username,
            page,
            size
        };
        const response = await tacticalGameApplicationService.find(criteria);
        res.json(response);
    } catch (error) {
        logger.error(`Error finding tactical games: ${(error as Error).message}`);
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.get('/:gameId', async (req: Request, res: Response) => {
    try {
        const gameId: string = req.params.gameId!;
        logger.info(`Search tactical game << ${gameId}`);
        const game = await tacticalGameApplicationService.findById(gameId);
        logger.info(`Found tactical game: ${game.name}`);
        res.json(game);
    } catch (error: any) {
        logger.error(`Error finding tactical game ${req.params.gameId}: ${error.message}`);
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        logger.info(`Tactical game creation << ${req.body.name}`);
        //TODO JWT
        const user: string = "lab.cabrera@gmail.com";

        const command: CreateTacticalGameCommand = {
            user,
            name: req.body.name,
            description: req.body.description,
            factions: req.body.factions
        };

        const newGame = await tacticalGameApplicationService.create(command);
        res.status(201).json(newGame);
    } catch (error: any) {
        logger.error(`Error creating tactical game: ${error.message}`);
        res.status(400).json({ message: error.message });
    }
});

router.patch('/:gameId', async (req: Request, res: Response) => {
    try {
        logger.info(`Tactical game update - ${req.params.gameId}`);
        const gameId: string = req.params.gameId!;

        const command: UpdateTacticalGameCommand = {
            name: req.body.name,
            description: req.body.description
        };

        const result = await tacticalGameApplicationService.update(gameId, command);
        res.json(result);
    } catch (error: any) {
        logger.error(`Error updating tactical game ${req.params.gameId}: ${error.message}`);
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

router.delete('/:gameId', async (req: Request, res: Response) => {
    try {
        const gameId: string = req.params.gameId!;
        logger.info(`Tactical game deletion << ${gameId}`);
        
        await tacticalGameApplicationService.delete(gameId);
        logger.info(`Tactical game deleted successfully: ${gameId}`);
        
        res.status(204).send(); // 204 No Content for successful deletion
    } catch (error: any) {
        logger.error(`Error deleting tactical game ${req.params.gameId}: ${error.message}`);
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

export default router;
