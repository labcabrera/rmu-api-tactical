import { Character } from "../../../domain/entities/character.entity";
import { CharacterRepository } from "../../../domain/ports/character.repository";
import { Logger } from "../../../domain/ports/logger";
import { CharacterProcessorService } from "../../../domain/services/character-processor.service";
import { EquipItemCommand } from "../../commands/equip-item-command";

export class EquipItemUseCase {
  constructor(
    private readonly tacticalCharacterRepository: CharacterRepository,
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly logger: Logger,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    this.logger.info(
      `Equipping item ${command.itemId} to character ${command.characterId}${command.slot ? ` in slot ${command.slot}` : ""}`,
    );

    const characterId = command.characterId;
    const character: Character =
      await this.tacticalCharacterRepository.findById(characterId);

    this.validateEquipmentData(character, command);
    this.applyEquipmentLogic(character, command);

    this.characterProcessorService.process(character);
    return await this.tacticalCharacterRepository.update(
      command.characterId,
      character,
    );
  }

  private validateEquipmentData(
    character: Character,
    command: EquipItemCommand,
  ): void {
    const item = character.items.find((e: any) => e.id === command.itemId);
    if (!item) {
      this.logger.error(`Invalid itemId: ${command.itemId}`);
      throw new Error("Invalid itemId");
    }

    if (command.slot) {
      switch (command.slot) {
        case "mainHand":
        case "offHand":
          if (item.category === "armor") {
            this.logger.error(
              "Cannot equip armor types in main hand or off-hand",
            );
            throw new Error(
              "Can not equip armor types in main hand or off-hand",
            );
          }
          break;
        case "body":
        case "head":
          if (item.category !== "armor") {
            this.logger.error("Required armor type for the requested slot");
            throw new Error("Required armor type for the requested slot");
          }
          break;
        default:
          this.logger.error(`Invalid item slot: ${command.slot}`);
          throw new Error("Invalid item slot");
      }
    }
  }

  private applyEquipmentLogic(
    character: Character,
    command: EquipItemCommand,
  ): void {
    const item = character.items.find((e: any) => e.id === command.itemId);
    if (!item) {
      this.logger.error(`Item not found: ${command.itemId}`);
      throw new Error("Item not found");
    }

    const slot = command.slot;

    // Set armor type if equipping body armor
    if (slot === "body" && item.armor && item.armor.armorType) {
      character.defense.armorType = item.armor.armorType;
    }

    // Remove item from all slots first (unequip if already equipped)
    if (character.equipment.mainHand === command.itemId) {
      delete character.equipment.mainHand;
    }
    if (character.equipment.offHand === command.itemId) {
      delete character.equipment.offHand;
    }
    if (character.equipment.body === command.itemId) {
      delete character.equipment.body;
    }
    if (character.equipment.head === command.itemId) {
      delete character.equipment.head;
    }

    // Equip item to specified slot
    if (slot === "mainHand") {
      character.equipment.mainHand = command.itemId;
    } else if (slot === "offHand") {
      character.equipment.offHand = command.itemId;
    } else if (slot === "body") {
      character.equipment.body = command.itemId;
    } else if (slot === "head") {
      character.equipment.head = command.itemId;
    }

    // Handle two-handed weapon in main hand
    if (slot === "mainHand" && item.weapon && item.weapon.requiredHands > 1) {
      delete character.equipment.offHand;
    }

    // Validate two-handed weapon in off-hand (not allowed)
    if (slot === "offHand" && item.weapon && item.weapon.requiredHands > 1) {
      this.logger.error(
        "Two handed weapons cannot be equipped in offHand slot",
      );
      throw new Error("Two handed weapons cant be equiped in offHand slot");
    }

    // Handle off-hand equipment with two-handed main hand weapon
    if (slot === "offHand" && character.equipment.mainHand) {
      const mainHandItem = character.items.find(
        (e: any) => e.id === character.equipment.mainHand,
      );
      if (mainHandItem?.weapon && mainHandItem.weapon.requiredHands > 1) {
        delete character.equipment.mainHand;
      }
    }

    // Set default armor type when no body armor is equipped
    if (!character.equipment.body) {
      character.defense.armorType = 1;
    }
  }
}
