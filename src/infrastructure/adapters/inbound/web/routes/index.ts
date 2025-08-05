import { Router } from "express";

import { ActionController } from "../controllers/action.controller";
import { AttackController } from "../controllers/attack.controller";
import { CharacterRoundController } from "../controllers/character-round.controller";
import { CharacterController } from "../controllers/character.controller";
import { GameController } from "../controllers/game.controller";

export class ApiRoutes {
  private router: Router;

  constructor() {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    const tacticalGameController = new GameController();
    const tacticalCharacterController = new CharacterController();
    const tacticalActionController = new ActionController();
    const attackController = new AttackController();
    const tacticalCharacterRoundController = new CharacterRoundController();

    this.router.use("/tactical-games", tacticalGameController.getRouter());
    this.router.use("/characters", tacticalCharacterController.getRouter());
    this.router.use("/actions", tacticalActionController.getRouter());
    this.router.use("/attacks", attackController.getRouter());
    this.router.use(
      "/tactical-character-rounds",
      tacticalCharacterRoundController.getRouter(),
    );
  }

  public getRouter(): Router {
    return this.router;
  }
}
