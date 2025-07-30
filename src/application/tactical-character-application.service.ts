import { Page } from '../domain/entities/page.entity';
import {
    CreateTacticalCharacterCommand,
    TacticalCharacter,
    TacticalCharacterSearchCriteria,
    UpdateTacticalCharacterCommand
} from '../domain/entities/tactical-character.entity';
import { Logger } from '../domain/ports/logger';
import { TacticalCharacterRepository } from '../domain/ports/tactical-character.repository';
import { TacticalGameRepository } from '../domain/ports/tactical-game.repository';
import { CharacterProcessorService } from '../domain/services/character-processor.service';
import { CreateTacticalCharacterUseCase } from './use-cases/tactical-character/CreateTacticalCharacterUseCase';
import { DeleteTacticalCharacterUseCase } from './use-cases/tactical-character/DeleteTacticalCharacterUseCase';
import { UpdateTacticalCharacterUseCase } from './use-cases/tactical-character/UpdateTacticalCharacterUseCase';

export class TacticalCharacterApplicationService {
    private createTacticalCharacterUseCase: CreateTacticalCharacterUseCase;
    private updateTacticalCharacterUseCase: UpdateTacticalCharacterUseCase;
    private deleteTacticalCharacterUseCase: DeleteTacticalCharacterUseCase;

    constructor(
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private tacticalGameRepository: TacticalGameRepository,
        private characterProcessorService: CharacterProcessorService,
        private logger: Logger
    ) {
        this.createTacticalCharacterUseCase = new CreateTacticalCharacterUseCase(
            tacticalCharacterRepository,
            tacticalGameRepository,
            characterProcessorService,
            logger
        );
        this.updateTacticalCharacterUseCase = new UpdateTacticalCharacterUseCase(
            tacticalCharacterRepository,
            logger
        );
        this.deleteTacticalCharacterUseCase = new DeleteTacticalCharacterUseCase(
            tacticalCharacterRepository,
            logger
        );
    }

    async findById(id: string): Promise<TacticalCharacter> {
        this.logger.info(`Finding tactical character by id: ${id}`);
        const character = await this.tacticalCharacterRepository.findById(id);
        if (!character) {
            const error = new Error('Tactical character not found');
            (error as any).status = 404;
            throw error;
        }
        return character;
    }

    async find(criteria: TacticalCharacterSearchCriteria): Promise<Page<TacticalCharacter>> {
        this.logger.info(`Finding tactical characters with criteria: ${JSON.stringify(criteria)}`);
        return await this.tacticalCharacterRepository.find(criteria);
    }

    async create(command: CreateTacticalCharacterCommand): Promise<TacticalCharacter> {
        return await this.createTacticalCharacterUseCase.execute(command);
    }

    async update(id: string, command: UpdateTacticalCharacterCommand): Promise<TacticalCharacter> {
        return await this.updateTacticalCharacterUseCase.execute(id, command);
    }

    async delete(id: string): Promise<void> {
        return await this.deleteTacticalCharacterUseCase.execute(id);
    }
}
