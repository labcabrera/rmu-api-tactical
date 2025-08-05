import express, { NextFunction, Request, Response, Router } from 'express';
import { inject } from 'inversify';

import { Logger } from '@domain/ports/logger';

import { FindCharacterRoundsUseCase } from '@application/use-cases/character-rounds/find-character-rounds.usecase';
import { TYPES } from '@shared/types';

export class CharacterRoundController {
  private router: Router;

  constructor(
    @inject(TYPES.FindCharacterRoundsUseCase) private readonly findCharacterRoundsUseCase: FindCharacterRoundsUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', this.findCharacterRounds.bind(this));
  }

  async findCharacterRounds(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 0;
      const size = req.query.size ? parseInt(req.query.size as string) : 10;
      const rsql = req.query.q as string;
      const result = await this.findCharacterRoundsUseCase.execute(rsql, page, size);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
