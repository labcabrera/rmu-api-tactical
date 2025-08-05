import express, { NextFunction, Request, Response, Router } from "express";
import { inject } from 'inversify';

import { Logger } from "@domain/ports/logger";
import { CharacterRoundQuery } from "@domain/queries/character-round.query";

import { FindCharacterRoundsUseCase } from "@application/use-cases/character-rounds/find-character-rounds.usecase";
import { TYPES } from '@shared/types';

export class CharacterRoundController {
  private router: Router;

  constructor(
    @inject(TYPES.FindCharacterRoundsUseCase) private readonly findCharacterRoundsUseCase: FindCharacterRoundsUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger,
  ) {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", this.findCharacterRounds.bind(this));
  }

  private async findCharacterRounds(req: Request,res: Response, next: NextFunction): Promise<void> {
    try {
    const query: CharacterRoundQuery = {
      gameId: req.query.gameId as string,
      round: req.query.round ? parseInt(req.query.round as string) : 0,
      characterId: req.query.characterId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 0,
      size: req.query.size ? parseInt(req.query.size as string) : 10,
    };
    const result = await this.findCharacterRoundsUseCase.execute(query);
    res.json(result);
  } catch (error) {
    next(error);
  }
  }

  public getRouter(): Router {
    return this.router;
  }
}
