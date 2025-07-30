import express, { Request, Response, Router } from 'express';
import errorService from "../../../services/error-service";
import tacticalActionService from "../../../services/tactical-action-service";

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
        this.router.get('/', this.findActions.bind(this));
        this.router.get('/:actionId', this.findActionById.bind(this));
        this.router.post('/', this.createAction.bind(this));
        this.router.patch('/:actionId', this.updateAction.bind(this));
    }

    private async findActions(req: Request<{}, {}, {}, ActionQuery>, res: Response): Promise<void> {
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
    }

    private async findActionById(req: Request, res: Response): Promise<void> {
        try {
            const actionId: string = req.params.actionId!;
            const readedAction = await tacticalActionService.findById(actionId);
            res.json(readedAction);
        } catch (error: any) {
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    private async createAction(req: Request, res: Response): Promise<void> {
        try {
            const user: string = "lab.cabrera@gmail.com"; //TODO JWT
            const newAction = await tacticalActionService.insert(req.body);
            res.status(201).json(newAction);
        } catch (error: any) {
            res.status(400).json({ message: error.message });
        }
    }

    private async updateAction(req: Request, res: Response): Promise<void> {
        try {
            const actionId: string = req.params.actionId!;
            const result = await tacticalActionService.update(actionId, req.body);
            res.json(result);
        } catch (error: any) {
            res.status(error.status ? error.status : 500).json({ message: error.message });
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
