import express, { Request, Response, Router } from 'express';
import { WinstonLogger } from '../infrastructure/logger/logger';

const router: Router = express.Router();
const logger = new WinstonLogger();

import errorService from "../services/error-service";
import tacticalGameService from "../services/tactical-game-service";

router.get('/', async (req: Request, res: Response) => {
    try {
        const searchExpression = req.query.search as string;
        const username = req.query.username as string;
        const page = req.query.page ? parseInt(req.query.page as string) : 0;
        const size = req.query.size ? parseInt(req.query.size as string) : 10;

        logger.info(`Finding tactical games - user: ${username}, page: ${page}, size: ${size}, search: ${searchExpression || 'none'}`);
        const response = await tacticalGameService.find(searchExpression, username, page, size);
        logger.info(`Found ${response.total} tactical games`);

        res.json(response);
    } catch (error) {
        logger.error(`Error finding tactical games: ${(error as Error).message}`);
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.get('/:gameId', async (req: Request, res: Response) => {
    try {
        const gameId: string = req.params.gameId!;
        logger.info(`Finding tactical game by ID: ${gameId}`);
        const game = await tacticalGameService.findById(gameId);
        logger.info(`Found tactical game: ${game.name}`);
        res.json(game);
    } catch (error: any) {
        logger.error(`Error finding tactical game ${req.params.gameId}: ${error.message}`);
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        logger.info(`Tactical game creation - ${req.body.name}`);
        //TODO JWT
        const user: string = "lab.cabrera@gmail.com";
        const newGame = await tacticalGameService.insert(user, req.body);
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
        const result = await tacticalGameService.update(gameId, req.body);
        res.json(result);
    } catch (error: any) {
        logger.error(`Error updating tactical game ${req.params.gameId}: ${error.message}`);
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

export default router;
