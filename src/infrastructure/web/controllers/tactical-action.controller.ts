import express, { Request, Response, Router } from 'express';

import { CreateActionCommand } from '../../../application/commands/create-action.command';
import { CreateActionUseCase } from '../../../application/use-cases/tactical-actions/create-action-use-case';
import { Logger } from '../../../domain/ports/logger';
import { DependencyContainer } from '../../dependency-container';
import { ErrorHandler } from '../error-handler';

export class TacticalActionController {

    private router: Router;
    private createActionUseCase: CreateActionUseCase;
    private logger: Logger;


    constructor() {
        this.router = express.Router();
        const container = DependencyContainer.getInstance();
        this.createActionUseCase = container.createActionUseCase;
        this.logger = container.logger;
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
            res.status(501).json({ message: 'Not implemented - awaiting TacticalAction use cases' });
        } catch (error) {
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    private async findActionById(req: Request, res: Response): Promise<void> {
        try {
            res.status(501).json({ message: 'Not implemented - awaiting TacticalAction use cases' });
        } catch (error) {
            ErrorHandler.sendErrorResponse(res, error as Error);
        }
    }

    private async createAction(req: Request, res: Response): Promise<void> {
        try {
            const command: CreateActionCommand = {
                gameId: req.body.gameId,
                round: req.body.round,
                characterId: req.body.characterId,
                actionType: req.body.actionType,
                phaseStart: req.body.phaseStart,
                actionPoints: req.body.actionPoints,
            };
            const response = await this.createActionUseCase.execute(command);
            res.status(201).json(response);
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
