import { Page } from '../domain/entities/page.entity';
import { TacticalGame, TacticalGameSearchCriteria } from '../domain/entities/tactical-game.entity';
import { CreateTacticalGameCommand } from './commands/create-tactical-game.command';
import { UpdateTacticalGameCommand } from './commands/update-tactical-game-command';
import { CreateTacticalGameUseCase } from './use-cases/tactical-game/CreateTacticalGameUseCase';
import { DeleteTacticalGameUseCase } from './use-cases/tactical-game/DeleteTacticalGameUseCase';
import { FindTacticalGameByIdUseCase } from './use-cases/tactical-game/FindTacticalGameByIdUseCase';
import { FindTacticalGamesUseCase } from './use-cases/tactical-game/FindTacticalGamesUseCase';
import { StartGameRoundUseCase } from './use-cases/tactical-game/StartGameRoundUseCase';
import { UpdateTacticalGameUseCase } from './use-cases/tactical-game/UpdateTacticalGameUseCase';

export class TacticalGameApplicationService {
    constructor(
        private readonly createUseCase: CreateTacticalGameUseCase,
        private readonly findByIdUseCase: FindTacticalGameByIdUseCase,
        private readonly findUseCase: FindTacticalGamesUseCase,
        private readonly updateUseCase: UpdateTacticalGameUseCase,
        private readonly deleteUseCase: DeleteTacticalGameUseCase,
        private readonly startRoundUseCase: StartGameRoundUseCase
    ) { }

    async findById(id: string): Promise<TacticalGame> {
        return this.findByIdUseCase.execute(id);
    }

    async find(criteria: TacticalGameSearchCriteria): Promise<Page<TacticalGame>> {
        return this.findUseCase.execute(criteria);
    }

    async create(command: CreateTacticalGameCommand): Promise<TacticalGame> {
        return this.createUseCase.execute(command);
    }

    async update(id: string, command: UpdateTacticalGameCommand): Promise<TacticalGame> {
        return this.updateUseCase.execute(id, command);
    }

    async delete(id: string): Promise<void> {
        return this.deleteUseCase.execute(id);
    }

    async startRound(gameId: string): Promise<TacticalGame> {
        return this.startRoundUseCase.execute(gameId);
    }

    async findTacticalCharacterRounds(gameId: string, round: number): Promise<any[]> {
        // TODO: Implement FindTacticalCharacterRoundsUseCase
        // For now, this is a placeholder that should be replaced with a proper use case
        // when TacticalCharacterRoundRepository is implemented

        // The implementation should be:
        // return this.findTacticalCharacterRoundsUseCase.execute(gameId, round);

        // Temporary implementation - returns empty array
        return [];
    }
}
