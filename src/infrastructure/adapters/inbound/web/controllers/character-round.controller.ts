import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';

import { Logger } from '@domain/ports/logger';

import { FindCharacterRoundsUseCase } from '@application/use-cases/character-rounds/find-character-rounds.usecase';
import { TYPES } from '@shared/types';

export class CharacterRoundController {

  constructor(
    @inject(TYPES.FindCharacterRoundsUseCase) private readonly findCharacterRoundsUseCase: FindCharacterRoundsUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async find(req: Request, res: Response, next: NextFunction): Promise<void> {
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

}
