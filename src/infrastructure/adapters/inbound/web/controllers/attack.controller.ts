import express, { NextFunction, Request, Response, Router } from "express";

// TODO: Implement Attack use cases
export class AttackController {
  private router: Router;

  constructor() {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post("/:actionId/roll", this.rollAttack.bind(this));
  }

  private async rollAttack(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // TODO: Implement Attack use cases
      res
        .status(501)
        .json({ message: "Not implemented - awaiting Attack use cases" });
      // const actionId: string = req.params.actionId!;
      // const result = await attackService.updateAttackRoll(actionId, req.body);
      // res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
