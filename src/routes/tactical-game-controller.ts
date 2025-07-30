import express, { Request, Response, Router } from 'express';
const router: Router = express.Router();

import tacticalGameService from "../services/tactical-game-service";
import errorService from "../services/error-service";

router.get('/', async (req: Request, res: Response) => {
    try {
        const searchExpression = req.query.search as string;
        const username = req.query.username as string;
        const page = req.query.page ? parseInt(req.query.page as string) : 0;
        const size = req.query.size ? parseInt(req.query.size as string) : 10;
        const response = await tacticalGameService.find(searchExpression, username, page, size);
        res.json(response);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.get('/:gameId', async (req: Request, res: Response) => {
    try {
        const gameId: string = req.params.gameId!;
        const readedGame = await tacticalGameService.findById(gameId);
        res.json(readedGame);
    } catch (error: any) {
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        console.log("Tactical game creation << " + req.body.name);
        //TODO JWT
        const user: string = "lab.cabrera@gmail.com";
        const newGame = await tacticalGameService.insert(user, req.body);
        res.status(201).json(newGame);
    } catch (error: any) {
        console.log(error);
        res.status(400).json({ message: error.message });
    }
});

router.patch('/:gameId', async (req: Request, res: Response) => {
    try {
        console.log("Tactical game update << " + req.params.gameId);
        const gameId: string = req.params.gameId!;
        const result = await tacticalGameService.update(gameId, req.body);
        res.json(result);
    } catch (error: any) {
        res.status(error.status ? error.status : 500).json({ message: error.message });
    }
});

export default router;
