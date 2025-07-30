import { TacticalGame } from '../domain/entities/tactical-game.entity';
import { CreateTacticalGameCommand } from './commands/create-tactical-game.command';
import { UpdateTacticalGameCommand } from './commands/update-tactical-game-command';
import { CreateTacticalGameUseCase } from './use-cases/tactical-game/create-tactical-game-use-case';
import { DeleteTacticalGameUseCase } from './use-cases/tactical-game/delete-tactical-game-use-case';
import { FindTacticalGamesUseCase } from './use-cases/tactical-game/find-tactical-games-use-case';
import { StartRoundUseCase } from './use-cases/tactical-game/start-round-use-case';
import { UpdateTacticalGameUseCase } from './use-cases/tactical-game/update-tactical-game-use-case';

export class TacticalGameApplicationService {
    constructor(
        private readonly createUseCase: CreateTacticalGameUseCase,
        private readonly findUseCase: FindTacticalGamesUseCase,
        private readonly updateUseCase: UpdateTacticalGameUseCase,
        private readonly deleteUseCase: DeleteTacticalGameUseCase,
        private readonly startRoundUseCase: StartRoundUseCase
    ) { }

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
