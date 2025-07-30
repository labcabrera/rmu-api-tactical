import { Router } from 'express';
import { AttackController } from '../controllers/attack.controller';
import { InitiativeController } from '../controllers/initiative.controller';
import { TacticalActionController } from '../controllers/tactical-action.controller';
import { TacticalCharacterController } from '../controllers/tactical-character.controller';
import { TacticalGameController } from '../controllers/tactical-game.controller';

export class ApiRoutes {
    private router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        const tacticalGameController = new TacticalGameController();
        const tacticalCharacterController = new TacticalCharacterController();
        const tacticalActionController = new TacticalActionController();
        const initiativeController = new InitiativeController();
        const attackController = new AttackController();

        this.router.use('/tactical-games', tacticalGameController.getRouter());
        this.router.use('/characters', tacticalCharacterController.getRouter());
        this.router.use('/tactical-actions', tacticalActionController.getRouter());
        this.router.use('/initiatives', initiativeController.getRouter());
        this.router.use('/attacks', attackController.getRouter());
    }

    public getRouter(): Router {
        return this.router;
    }
}
