import { CreateTacticalGameCommand, PaginatedTacticalGames, TacticalGame, TacticalGameSearchCriteria, UpdateTacticalGameCommand } from '../domain/entities/TacticalGame';
import { CreateTacticalGameUseCase } from './use-cases/CreateTacticalGameUseCase';
import { DeleteTacticalGameUseCase } from './use-cases/DeleteTacticalGameUseCase';
import { FindTacticalGameByIdUseCase } from './use-cases/FindTacticalGameByIdUseCase';
import { FindTacticalGamesUseCase } from './use-cases/FindTacticalGamesUseCase';
import { UpdateTacticalGameUseCase } from './use-cases/UpdateTacticalGameUseCase';

export class TacticalGameApplicationService {
    constructor(
        private readonly createUseCase: CreateTacticalGameUseCase,
        private readonly findByIdUseCase: FindTacticalGameByIdUseCase,
        private readonly findUseCase: FindTacticalGamesUseCase,
        private readonly updateUseCase: UpdateTacticalGameUseCase,
        private readonly deleteUseCase: DeleteTacticalGameUseCase
    ) { }

    async findById(id: string): Promise<TacticalGame> {
        return this.findByIdUseCase.execute(id);
    }

    async find(criteria: TacticalGameSearchCriteria): Promise<PaginatedTacticalGames> {
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
}
