import express, { Request, Response, Router } from 'express';
import attackService from "../../../services/attack/attack-service";
import errorService from "../../../services/error-service";

export class AttackController {
    private router: Router;

    constructor() {
        this.router = express.Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/:actionId/roll', this.rollAttack.bind(this));
    }

    private async rollAttack(req: Request, res: Response): Promise<void> {
        try {
            const actionId: string = req.params.actionId!;
            const result = await attackService.updateAttackRoll(actionId, req.body);
            res.json(result);
        } catch (error) {
            errorService.sendErrorResponse(res, error as Error);
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
