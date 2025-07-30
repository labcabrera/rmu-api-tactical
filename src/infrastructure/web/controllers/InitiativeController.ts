import express, { Request, Response, Router } from 'express';
import errorService from "../../../services/error-service";
import initiativeService from "../../../services/initiative-service";

export class InitiativeController {
    private router: Router;

    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/:characterRoundId/roll/:initiativeRoll', this.rollInitiative.bind(this));
    }

    private async rollInitiative(req: Request, res: Response): Promise<void> {
        try {
            const characterRoundId: string = req.params.characterRoundId!;
            const initiativeRoll: number = parseInt(req.params.initiativeRoll!);
            const result = await initiativeService.updateInitiative(characterRoundId, initiativeRoll);
            res.json(result);
        } catch (error) {
            errorService.sendErrorResponse(res, error as Error);
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
