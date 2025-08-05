import { NextFunction, Request, Response } from "express";
import { inject } from 'inversify';

import { Logger } from "@domain/ports/logger";
import { ActionQuery } from "@domain/queries/action.query";

import { CreateActionCommand } from "@application/commands/create-action.command";
import { CreateActionUseCase } from "@application/use-cases/actions/create-action.usecase";
import { DeleteActionUseCase } from "@application/use-cases/actions/delete-action.usecase";
import { FindActionByIdUseCase } from "@application/use-cases/actions/find-action-by-id.usecase";
import { FindActionsUseCase } from "@application/use-cases/actions/find-actions.usecase";

import { DeleteActionCommand } from "@application/commands/delete-action.command";
import { TYPES } from '@shared/types';

export class ActionController {

  constructor(
    @inject(TYPES.FindActionByIdUseCase) private readonly findActionByIdUseCase: FindActionByIdUseCase,
    @inject(TYPES.FindActionsUseCase) private readonly findActionsUseCase: FindActionsUseCase,
    @inject(TYPES.CreateActionUseCase) private readonly createActionUseCase: CreateActionUseCase,
    @inject(TYPES.DeleteActionUseCase) private readonly deleteActionUseCase: DeleteActionUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {}

  async findActions(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      next(error);
    }
  }

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const response = await this.findActionByIdUseCase.execute(
        req.params.actionId!,
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
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
      next(error);
    }
  }

  async deleteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const command: DeleteActionCommand = {
        actionId: req.params.actionId!,
      };
      await this.deleteActionUseCase.execute(command);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
}
