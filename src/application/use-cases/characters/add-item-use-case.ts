import { randomUUID } from "crypto";

import { Character, CharacterItem } from "@/domain/entities/character.entity";
import { CharacterRepository } from "@/domain/ports/character.repository";
import { Logger } from "@domain/ports/logger";

import { AddItemCommand } from "@application/commands/add-item.comand";
import { CharacterProcessorService } from "../../../domain/services/character-processor.service";

export class AddItemUseCase {
  constructor(
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly tacticalCharacterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(command: AddItemCommand): Promise<Character> {
    this.logger.info(
      `AddItemUseCase: Adding item ${command.item.itemTypeId} to character ${command.characterId}`,
    );
    this.validateCommand(command);
    const characterId = command.characterId;
    const character: Character =
      await this.tacticalCharacterRepository.findById(command.characterId);
    const item: CharacterItem = {
      id: randomUUID(),
      name: command.item.name ? command.item.name : command.item.itemTypeId,
      itemTypeId: command.item.itemTypeId,
      category: command.item.category,
      weapon: command.item.weapon,
      weaponRange: command.item.weaponRange,
      armor: command.item.armor,
      info: command.item.info,
    };
    character.items.push(item);
    this.characterProcessorService.process(character);
    return await this.tacticalCharacterRepository.update(
      characterId,
      character,
    );
  }

  private validateCommand(command: AddItemCommand): void {
    if (!command.characterId) {
      throw new Error("Required characterId");
    }
    if (!command.item) {
      throw new Error("Required item data");
    }
    if (!command.item.itemTypeId) {
      throw new Error("Required itemTypeId");
    }
    if (!command.item.category) {
      throw new Error("Required category");
    }
    if (command.item.category === "weapon" && !command.item.weapon) {
      throw new Error("Required weapon data for weapon category");
    }
  }
}
