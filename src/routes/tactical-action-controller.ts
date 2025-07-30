import express, { Request, Response, Router } from 'express';
const router: Router = express.Router();

import errorService from "../services/error-service";
import tacticalActionService from "../services/tactical-action-service";

interface ActionQuery {
    tacticalGameId?: string;
    tacticalCharacterId?: string;
    round?: string;
    page?: string;
    size?: string;
}

router.get('/', async (req: Request<{}, {}, {}, ActionQuery>, res: Response) => {
    try {
        const tacticalGameId = req.query.tacticalGameId;
        const tacticalCharacterId = req.query.tacticalCharacterId;
        const round = req.query.round;
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const size = req.query.size ? parseInt(req.query.size) : 10;
        const response = await tacticalActionService.find(tacticalGameId, tacticalCharacterId, round, page, size);
        res.json(response);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.get('/:actionId', async (req: Request, res: Response) => {
    try {
        const actionId: string = req.params.actionId!;
        const readedAction = await tacticalActionService.findById(actionId);
        res.json(readedAction);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.post('/', async (req: Request, res: Response) => {
    try {
        const newAction = await tacticalActionService.insert(req.body);
        res.status(201).json(newAction);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.patch('/:actionId', async (req: Request, res: Response) => {
    try {
        const actionId: string = req.params.actionId!;
        const result = await tacticalActionService.update(actionId, req.body);
        res.status(200).json(result);
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

router.delete('/:actionId', async (req: Request, res: Response) => {
    try {
        const actionId: string = req.params.actionId!;
        await tacticalActionService.deleteById(actionId);
        res.status(204).send();
    } catch (error) {
        errorService.sendErrorResponse(res, error as Error);
    }
});

export default router;
