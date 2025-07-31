import express, { Request, Response, Router } from 'express';

import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRoundQuery } from '@domain/queries/tactical-character-round.query';

import { FindTacticalCharacterRoundsUseCase } from '@application/use-cases/tactical-character-round/find-tactical-character-rounds-use-case';

import { DependencyContainer } from '../../dependency-container';

export class TacticalCharacterRoundController {

    private router: Router;
    private findTacticalCharacterRoundsUseCase: FindTacticalCharacterRoundsUseCase;
    private logger: Logger;

    constructor() {
        this.router = express.Router();
        const container = DependencyContainer.getInstance();
        this.findTacticalCharacterRoundsUseCase = container.findTacticalCharacterRoundsUseCase;
        this.logger = container.logger;
        this.initializeRoutes();
    }

    private initializeRoutes(): void {
        this.router.get('/', this.findCharacterRounds.bind(this));
    }

    private async findCharacterRounds(req: Request, res: Response): Promise<void> {
        const query: TacticalCharacterRoundQuery = {
            gameId: req.query.gameId as string,
            characterId: req.query.characterId as string,
            round: req.query.round ? parseInt(req.query.round as string) : 0,
            page: req.query.page ? parseInt(req.query.page as string) : 0,
            size: req.query.size ? parseInt(req.query.size as string) : 10
        };
        const result = await this.findTacticalCharacterRoundsUseCase.execute(query);
        res.json(result);
    }

    public getRouter(): Router {
        return this.router;
    }
}