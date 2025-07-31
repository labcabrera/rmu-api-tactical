import { TacticalCharacter } from '../../../domain/entities/tactical-character.entity';
import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';

export class FindTCharacterByIdUseCase {
    constructor(
        private readonly repository: TacticalCharacterRepository,
        private readonly logger: Logger
    ) { }

    async execute(id: string): Promise<TacticalCharacter> {
        return await this.repository.findById(id);
    }
}
