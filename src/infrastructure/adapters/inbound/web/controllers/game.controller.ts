import express, { NextFunction, Request, Response, Router } from "express";
import { inject } from 'inversify';

import { Logger } from "@domain/ports/logger";
import { GameQuery } from "@domain/queries/game.query";

import { CreateGameCommand } from "@application/commands/create-game.command";
import { UpdateGameCommand } from "@application/commands/update-game.command";
import { CreateGameUseCase } from "@application/use-cases/games/create-game-use-case";
import { DeleteGameUseCase } from "@application/use-cases/games/delete-game-use-case";
import { FindGameByIdUseCase } from "@application/use-cases/games/find-game-by-id-use-case";
import { FindGamesUseCase } from "@application/use-cases/games/find-games-use-case";
import { StartRoundUseCase } from "@application/use-cases/games/start-round-use-case";
import { UpdateGameUseCase } from "@application/use-cases/games/update-game-use-case";

import { TYPES } from '@shared/types';


export class GameController {
  private router: Router;
  constructor(
    @inject(TYPES.FindGamesUseCase) private readonly findUseCase: FindGamesUseCase,
    @inject(TYPES.FindGameByIdUseCase) private readonly findByIdUseCase: FindGameByIdUseCase,
    @inject(TYPES.CreateGameUseCase) private readonly createUseCase: CreateGameUseCase,
    @inject(TYPES.UpdateGameUseCase) private readonly updateUseCase: UpdateGameUseCase,
    @inject(TYPES.DeleteGameUseCase) private readonly deleteUseCase: DeleteGameUseCase,
    @inject(TYPES.StartRoundUseCase) private readonly startRoundUseCase: StartRoundUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger

  ) {
    this.router = express.Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", this.findGames.bind(this));
    this.router.get("/:gameId", this.findGameById.bind(this));
    this.router.post("/", this.createGame.bind(this));
    this.router.patch("/:gameId", this.updateGame.bind(this));
    this.router.delete("/:gameId", this.deleteGame.bind(this));
    this.router.post("/:gameId/rounds/start", this.startRound.bind(this));
  }

  private async findGames(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const username = req.query.username as string;
      const searchExpression = req.query.search as string;
      const page = req.query.page ? parseInt(req.query.page as string) : 0;
      const size = req.query.size ? parseInt(req.query.size as string) : 10;
      const query: GameQuery = {
        searchExpression: searchExpression,
        username: username,
        page: page,
        size: size,
      };
      const response = await this.findUseCase.execute(query);
      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  private async findGameById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const gameId: string = req.params.gameId!;
      this.logger.info(`Search tactical game << ${gameId}`);
      const game = await this.findByIdUseCase.execute(gameId);
      res.json(game);
    } catch (error) {
      next(error);
    }
  }

  private async createGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`Tactical game creation << ${req.body.name}`);
      //TODO JWT
      const user: string = "lab.cabrera@gmail.com";
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

  private async updateGame(req: Request, res: Response, next: NextFunction): Promise<void> {
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

  private async deleteGame(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(`Tactical game deletion << ${req.params.gameId}`);
      const gameId: string = req.params.gameId!;
      await this.deleteUseCase.execute(gameId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }

  private async startRound(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      this.logger.info(
        `GameController: Starting round for game << ${req.params.gameId}`,
      );
      const gameId: string = req.params.gameId!;
      const result = await this.startRoundUseCase.execute(gameId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  public getRouter(): Router {
    return this.router;
  }
}
