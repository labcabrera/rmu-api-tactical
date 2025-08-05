import { NextFunction, Request, Response } from 'express';
import { inject } from 'inversify';

import { Logger } from '@domain/ports/logger';

import { CreateGameCommand } from '@application/commands/create-game.command';
import { UpdateGameCommand } from '@application/commands/update-game.command';
import { CreateGameUseCase } from '@application/use-cases/games/create-game.usecase';
import { DeleteGameUseCase } from '@application/use-cases/games/delete-game.usecase';
import { FindGameByIdUseCase } from '@application/use-cases/games/find-game-by-id-use-case';
import { FindGamesUseCase } from '@application/use-cases/games/find-games-use-case';
import { StartRoundUseCase } from '@application/use-cases/games/start-round-use-case';
import { UpdateGameUseCase } from '@application/use-cases/games/update-game-use-case';

import { TYPES } from '@shared/types';

export class GameController {
  constructor(
    @inject(TYPES.FindGamesUseCase) private readonly findUseCase: FindGamesUseCase,
    @inject(TYPES.FindGameByIdUseCase) private readonly findByIdUseCase: FindGameByIdUseCase,
    @inject(TYPES.CreateGameUseCase) private readonly createUseCase: CreateGameUseCase,
    @inject(TYPES.UpdateGameUseCase) private readonly updateUseCase: UpdateGameUseCase,
    @inject(TYPES.DeleteGameUseCase) private readonly deleteUseCase: DeleteGameUseCase,
    @inject(TYPES.StartRoundUseCase) private readonly startRoundUseCase: StartRoundUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async findById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info(`Search tactical game << ${id}`);
      const game = await this.findByIdUseCase.execute(id);
      res.json(game);
    } catch (error) {
      next(error);
    }
  }

  async find(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const page = req.query.page ? parseInt(req.query.page as string) : 0;
      const size = req.query.size ? parseInt(req.query.size as string) : 10;
      const rsql = req.query.q as string;
      const response = await this.findUseCase.execute(rsql, page, size);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }



  async create(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`Tactical game creation << ${req.body.name}`);
      //TODO JWT
      const user: string = 'lab.cabrera@gmail.com';
      const command: CreateGameCommand = {
        user,
        name: req.body.name,
        description: req.body.description,
        factions: req.body.factions,
      };
      const newGame = await this.createUseCase.execute(command);
      res.status(201).json(newGame);
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`Tactical game update - ${req.params.gameId}`);
      const command: UpdateGameCommand = {
        gameId: req.params.gameId!,
        name: req.body.name,
        description: req.body.description,
      };
      const result = await this.updateUseCase.execute(command);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  async deleteById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      this.logger.info(`Handle delete game request << ${id}`);
      await this.deleteUseCase.execute(id);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  async startRound(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`GameController: Starting round for game << ${req.params.gameId}`);
      const gameId: string = req.params.gameId!;
      const result = await this.startRoundUseCase.execute(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}
