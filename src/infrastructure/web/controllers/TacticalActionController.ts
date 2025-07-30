import express, { Request, Response, Router } from 'express';
import { ErrorHandler } from '../ErrorHandler';
// TODO: Implement TacticalAction use cases
// import tacticalActionService from "../../../services/tactical-action-service";

interface ActionQuery {
    tacticalGameId?: string;
    tacticalCharacterId?: string;
    round?: string;
    page?: string;
    size?: string;
}

export class TacticalActionController {
    private router: Router;

    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.getAllActions.bind(this));
        this.router.get('/:actionId', this.findActionById.bind(this));
        this.router.post('/', this.createAction.bind(this));
        this.router.patch('/:actionId', this.updateAction.bind(this));
    }

    async getAllActions(req: Request, res: Response) {
        try {
            // TODO: Implement TacticalAction use cases
            res.status(501).json({ message: 'Not implemented - awaiting TacticalAction use cases' });
            // const { tacticalGameId, tacticalCharacterId, round, page = '0', size = '10' } = req.query as ActionQuery;
            // const response = await tacticalActionService.find(tacticalGameId, tacticalCharacterId, round, page, size);
            // res.json(response);
        } catch (error) {
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    private async findActionById(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement TacticalAction use cases
            res.status(501).json({ message: 'Not implemented - awaiting TacticalAction use cases' });
            // const actionId: string = req.params.actionId!;
            // const readedAction = await tacticalActionService.findById(actionId);
            // res.json(readedAction);
        } catch (error) {
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    private async createAction(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement TacticalAction use cases
            res.status(501).json({ message: 'Not implemented - awaiting TacticalAction use cases' });
            // const user: string = "lab.cabrera@gmail.com"; //TODO JWT
            // const newAction = await tacticalActionService.insert(req.body);
            // res.status(201).json(newAction);
        } catch (error) {
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    private async updateAction(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement TacticalAction use cases
            res.status(501).json({ message: 'Not implemented - awaiting TacticalAction use cases' });
            // const actionId: string = req.params.actionId!;
            // const result = await tacticalActionService.update(actionId, req.body);
            // res.json(result);
        } catch (error) {
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
