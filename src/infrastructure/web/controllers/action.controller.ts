import express, { Request, Response, Router } from "express";

import { Logger } from "@domain/ports/logger";

import { CreateActionUseCase } from "@/application/use-cases/actions/create-action.usecase";
import { DeleteActionUseCase } from "@/application/use-cases/actions/delete-action.usecase";
import { FindActionByIdUseCase } from "@/application/use-cases/actions/find-action-by-id.usecase";
import { FindActionsUseCase } from "@/application/use-cases/actions/find-actions.usecase";
import { CreateActionCommand } from "@application/commands/create-action.command";

import { DeleteActionCommand } from "../../../application/commands/delete-action.command";
import { ActionQuery } from "../../../domain/queries/action.query";
import { DependencyContainer } from "../../dependency-container";
import { ErrorHandler } from "../error-handler";

export class ActionController {
  private router: Router;
  private findActionByIdUseCase: FindActionByIdUseCase;
  private findActionsUseCase: FindActionsUseCase;
  private createActionUseCase: CreateActionUseCase;
  private deleteActionUseCase: DeleteActionUseCase;
  private logger: Logger;

  constructor() {
    this.router = express.Router();
    const container = DependencyContainer.getInstance();
    this.findActionByIdUseCase = container.findActionByIdUseCase;
    this.findActionsUseCase = container.findActionsUseCase;
    this.createActionUseCase = container.createActionUseCase;
    this.deleteActionUseCase = container.deleteActionUseCase;
    this.logger = container.logger;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", this.findActions.bind(this));
    this.router.get("/:actionId", this.findActionById.bind(this));
    this.router.post("/", this.createAction.bind(this));
    this.router.delete("/:actionId", this.deleteAction.bind(this));
  }

  async findActions(req: Request, res: Response) {
    try {
      const query: ActionQuery = {
        ...(req.query.gameId && { gameId: req.query.gameId as string }),
        ...(req.query.round && { round: parseInt(req.query.round as string) }),
        ...(req.query.characterId && {
          characterId: req.query.characterId as string,
        }),
        ...(req.query.actionType && {
          actionType: req.query.actionType as string,
        }),
        page: req.query.page ? parseInt(req.query.page as string) : 0,
        size: req.query.size ? parseInt(req.query.size as string) : 10,
      };
      const response = await this.findActionsUseCase.execute(query);
      res.json(response);
    } catch (error) {
      this.logger.error(`Error finding actions: ${(error as Error).message}`);
      ErrorHandler.sendErrorResponse(res, error as Error);
    }
  }

  private async findActionById(req: Request, res: Response): Promise<void> {
    try {
      const response = await this.findActionByIdUseCase.execute(
        req.params.actionId!,
      );
      res.json(response);
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

  private async deleteAction(req: Request, res: Response): Promise<void> {
    try {
      const command: DeleteActionCommand = {
        actionId: req.params.actionId!,
      };
      await this.deleteActionUseCase.execute(command);
      res.status(204).send();
    } catch (error) {
      ErrorHandler.sendErrorResponse(res, error as Error);
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
