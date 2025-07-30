import express, { Request, Response, Router } from 'express';
import errorService from "../../../services/error-service";
import { DependencyContainer } from '../../DependencyContainer';

export class InitiativeController {
    private router: Router;
    private readonly container: DependencyContainer;

    constructor() {
        this.router = express.Router();
        this.container = DependencyContainer.getInstance();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.post('/:characterRoundId/roll/:initiativeRoll', this.rollInitiative.bind(this));
    }

    private async rollInitiative(req: Request, res: Response): Promise<void> {
        try {
            const characterRoundId: string = req.params.characterRoundId!;
            const initiativeRoll: number = parseInt(req.params.initiativeRoll!);

            const updateCharacterInitiativeUseCase = this.container.updateCharacterInitiativeUseCase;
            const command = {
                tacticalCharacterRoundId: characterRoundId,
                initiativeRoll: initiativeRoll
            };

            const result = await updateCharacterInitiativeUseCase.execute(command);
            res.json(result);
        } catch (error) {
            errorService.sendErrorResponse(res, error as Error);
        }
    }

    public getRouter(): Router {
        return this.router;
    }
}
