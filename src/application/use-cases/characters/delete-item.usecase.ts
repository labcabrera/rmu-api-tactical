import { Character } from "@domain/entities/character.entity";
import { CharacterRepository } from "@domain/ports/character.repository";
import { Logger } from "@domain/ports/logger";

export class DeleteItemUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly logger: Logger,
  ) {}

  async execute(characterId: string, itemId: string): Promise<Character> {
    const character: Character =
      await this.characterRepository.findById(characterId);

    const item = character.items.find((item) => item.id === itemId);
    if (!item) {
      throw new Error(
        `Item with id ${itemId} not found in character ${characterId}`,
      );
    }
    character.items = character.items.filter((item) => item.id !== itemId);
    this.cleanupEquipedItem(character.equipment, itemId);
    character.equipment.weight = this.calculateTotalWeight(character.items);
    const updated = await this.characterRepository.update(
      characterId,
      character,
    );
    return updated;
  }

  private cleanupEquipedItem(equipment: any, deletedItemId: string): void {
    const slots = ["mainHand", "offHand", "body", "head", "arms", "legs"];
    for (const slot of slots) {
      if (equipment[slot] === deletedItemId) {
        equipment[slot] = null;
        this.logger.info(`Removed deleted item from ${slot} slot`);
      }
    }
  }

  private calculateTotalWeight(items: any[]): number {
    return items.reduce((accumulator: number, item: any) => {
      return accumulator + this.getItemWeight(item);
    }, 0);
  }

  private getItemWeight(item: any): number {
    if (!item.info || !item.info.weight) {
      return 0;
    }
    return item.info.weight;
  }
}
