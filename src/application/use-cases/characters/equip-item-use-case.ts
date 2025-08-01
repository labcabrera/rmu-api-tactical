import {
  Character,
  CharacterEquipment,
  CharacterItem,
} from "../../../domain/entities/character.entity";
import { CharacterRepository } from "../../../domain/ports/character.repository";
import { Logger } from "../../../domain/ports/logger";
import { CharacterProcessorService } from "../../../domain/services/character-processor.service";
import { EquipItemCommand } from "../../commands/equip-item-command";

export class EquipItemUseCase {
  constructor(
    private readonly characterRepository: CharacterRepository,
    private readonly characterProcessorService: CharacterProcessorService,
    private readonly logger: Logger,
  ) {}

  async execute(command: EquipItemCommand): Promise<Character> {
    this.logger.info(
      `Equipping item ${command.itemId} to character ${command.characterId}${command.slot ? ` in slot ${command.slot}` : ""}`,
    );

    const characterId = command.characterId;
    const character: Character =
      await this.characterRepository.findById(characterId);

    const item: CharacterItem = character.items.find(
      (e: any) => e.id === command.itemId,
    ) as CharacterItem;
    if (!item) {
      throw new Error(`Item not found: ${command.itemId}`);
    }

    this.validateEquipmentData(character, item, command);
    this.applyEquipmentLogic(character, item, command);

    this.characterProcessorService.process(character);
    return await this.characterRepository.update(
      command.characterId,
      character,
    );
  }

  private validateEquipmentData(
    character: Character,
    item: CharacterItem,
    command: EquipItemCommand,
  ): void {
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
      if (
        command.slot === "offHand" &&
        item.weapon &&
        item.weapon.requiredHands > 1
      ) {
        throw new Error("Two handed weapons cant be equiped in offHand slot");
      }
    }
  }

  private applyEquipmentLogic(
    character: Character,
    item: CharacterItem,
    command: EquipItemCommand,
  ): void {
    const slot = command.slot;
    const equipment: CharacterEquipment = character.equipment;
    const slots: (keyof CharacterEquipment)[] = [
      "mainHand",
      "offHand",
      "body",
      "head",
    ];
    slots.forEach((s) => {
      if (equipment[s] === command.itemId) {
        equipment[s] = null;
      }
    });
    if (
      command.slot === "offHand" &&
      item.weapon &&
      item.weapon.requiredHands > 1
    ) {
      equipment.offHand = null;
    }

    // Set armor type if equipping body armor
    if (slot === "body" && item.armor && item.armor.armorType) {
      character.defense.armorType = item.armor.armorType;
    }

    // Equip item to specified slot
    if (slot === "mainHand") {
      equipment.mainHand = command.itemId;
    } else if (slot === "offHand") {
      equipment.offHand = command.itemId;
    } else if (slot === "body") {
      equipment.body = command.itemId;
    } else if (slot === "head") {
      equipment.head = command.itemId;
    }

    // Handle two-handed weapon in main hand
    if (slot === "mainHand" && item.weapon && item.weapon.requiredHands > 1) {
      equipment.offHand = null;
    }

    // Set default armor type when no body armor is equipped
    // if (!equipment.body) {
    //   //TODO check racial armor type
    //   character.defense.armorType = 1;
    // }
  }
}
