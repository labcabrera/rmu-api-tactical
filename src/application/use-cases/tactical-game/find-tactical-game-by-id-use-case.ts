import { TacticalGame } from '../../../domain/entities/tactical-game.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalGameRepository } from '../../../domain/ports/tactical-game.repository';

export class FindTacticalGameByIdUseCase {
    constructor(
        private readonly repository: TacticalGameRepository,
        private readonly logger: Logger
    ) { }

    async execute(id: string): Promise<TacticalGame> {
        return await this.repository.findById(id);
    }
}
