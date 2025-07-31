import express, { Request, Response, Router } from "express";
import { ErrorHandler } from "../error-handler";
// TODO: Implement Attack use cases
// import attackService from "../../../services/attack/attack-service";

export class AttackController {
  private router: Router;

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/:actionId/roll", this.rollAttack.bind(this));
  }

  private async rollAttack(req: Request, res: Response): Promise<void> {
    try {
      // TODO: Implement Attack use cases
      res
        .status(501)
        .json({ message: "Not implemented - awaiting Attack use cases" });
      // const actionId: string = req.params.actionId!;
      // const result = await attackService.updateAttackRoll(actionId, req.body);
      // res.json(result);
    } catch (error) {
      ErrorHandler.sendErrorResponse(res, error as Error);
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
