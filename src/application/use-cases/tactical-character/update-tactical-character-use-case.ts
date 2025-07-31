import { TacticalCharacter } from '@domain/entities/tactical-character.entity';
import { Logger } from '@domain/ports/logger';
import { TacticalCharacterRepository } from '@domain/ports/tactical-character.repository';
import { CharacterProcessorService } from '@domain/services/character-processor.service';

import { UpdateTacticalCharacterCommand } from '@application/commands/update-tactical-character.command';

export class UpdateTacticalCharacterUseCase {

    constructor(
        private readonly characterProcessorService: CharacterProcessorService,
        private tacticalCharacterRepository: TacticalCharacterRepository,
        private logger: Logger
    ) { }

    async execute(command: UpdateTacticalCharacterCommand): Promise<TacticalCharacter> {
        try {
            this.logger.info(`UpdateTacticalCharacterUseCase: Updating tactical character: ${command.characterId}`);
            const characterId = command.characterId;
            const character: TacticalCharacter = await this.tacticalCharacterRepository.findById(characterId);

            this.bindBasicFields(character, command);
            this.bindInfoFielsds(character, command);
            this.bindMovementFielsds(character, command);
            this.bindHPFielsds(character, command);
            //TODO

            this.characterProcessorService.process(character);
            return await this.tacticalCharacterRepository.update(characterId, character);
        } catch (error) {
            this.logger.error(`Error updating tactical character: ${error}`);
            throw Error(`Failed to update tactical character: ${error}`);
        }
    }

    private bindBasicFields(character: TacticalCharacter, command: UpdateTacticalCharacterCommand): void {
        if (command.name) {
            character.name = command.name;
        }
        if (command.faction) {
            character.faction = command.faction;
        }
    }

    private bindInfoFielsds(character: TacticalCharacter, command: UpdateTacticalCharacterCommand): void {
        if(!command.info) {
            return;
        }
        if (command.info.level) {
            character.info.level = command.info.level;
        }
        if(command.info.height) {
            character.info.height = command.info.height;
        }
        if(command.info.weight) {
            character.info.weight = command.info.weight;
        }
    }

    private bindMovementFielsds(character: TacticalCharacter, command: UpdateTacticalCharacterCommand): void {
    }

    private bindHPFielsds(character: TacticalCharacter, command: UpdateTacticalCharacterCommand): void {
        if(!command.hp) {
            return;
        }
        if (command.hp.current) {
            character.hp.current = command.hp.current;
        }
        if(command.hp.max) {
            character.hp.max = command.hp.max;
        }
    }
}
