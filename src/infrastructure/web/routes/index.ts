import { Router } from 'express';
import { AttackController } from '../controllers/AttackController';
import { InitiativeController } from '../controllers/InitiativeController';
import { TacticalActionController } from '../controllers/TacticalActionController';
import { TacticalCharacterController } from '../controllers/TacticalCharacterController';
import { TacticalGameController } from '../controllers/TacticalGameController';

export class ApiRoutes {
    private router: Router;

    constructor() {
        this.router = Router();
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        // Instanciar controladores
        const tacticalGameController = new TacticalGameController();
        const tacticalCharacterController = new TacticalCharacterController();
        const tacticalActionController = new TacticalActionController();
        const initiativeController = new InitiativeController();
        const attackController = new AttackController();

        // Configurar rutas principales
        this.router.use('/tactical-games', tacticalGameController.getRouter());
        this.router.use('/tactical-characters', tacticalCharacterController.getRouter());
        this.router.use('/tactical-actions', tacticalActionController.getRouter());
        this.router.use('/initiatives', initiativeController.getRouter());
        this.router.use('/attacks', attackController.getRouter());
    }

    public getRouter(): Router {
        return this.router;
    }
}
