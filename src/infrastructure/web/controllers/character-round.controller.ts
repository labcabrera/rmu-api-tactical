import express, { Request, Response, Router } from "express";

import { CharacterRoundQuery } from "@domain/queries/character-round.query";
import { Logger } from "@domain/ports/logger";

import { FindCharacterRoundsUseCase } from "@application/use-cases/character-rounds/find-character-rounds.usecase";

import { DependencyContainer } from "../../dependency-container";

export class CharacterRoundController {
  private router: Router;
  private findCharacterRoundsUseCase: FindCharacterRoundsUseCase;
  private logger: Logger;

  constructor() {
    this.router = express.Router();
    const container = DependencyContainer.getInstance();
    this.findCharacterRoundsUseCase =
      container.findTacticalCharacterRoundsUseCase;
    this.logger = container.logger;
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get("/", this.findCharacterRounds.bind(this));
  }

  private async findCharacterRounds(
    req: Request,
    res: Response,
  ): Promise<void> {
    this.logger.debug(`CharacterRoundController: Finding character rounds`);
    const query: CharacterRoundQuery = {
      gameId: req.query.gameId as string,
      round: req.query.round ? parseInt(req.query.round as string) : 0,
      characterId: req.query.characterId as string,
      page: req.query.page ? parseInt(req.query.page as string) : 0,
      size: req.query.size ? parseInt(req.query.size as string) : 10,
    };
    const result = await this.findCharacterRoundsUseCase.execute(query);
    res.json(result);
  }

  public getRouter(): Router {
    return this.router;
  }
}
