import { Logger } from '../../../domain/ports/logger';
import { TacticalCharacterRepository } from '../../../domain/ports/tactical-character.repository';
import { CharacterProcessorService } from '../../../domain/services/character-processor.service';

export interface CharacterEquipItemCommand {
    characterId: string;
    itemId: string;
    slot?: string;
}

export interface EquippedCharacter {
    id: string;
    name: string;
    gameId: string;
    faction: string;
    equipment: {
        mainHand?: string | null;
        offHand?: string | null;
        body?: string | null;
        head?: string | null;
        arms?: string | null;
        legs?: string | null;
    };
    defense: {
        armorType: number;
        baseDefense: number;
        penaltyDefense: number;
        customDefense: number;
        totalDefense: number;
    };
    items: Array<{
        id: string;
        name: string;
        category: string;
        weight: number;
        weapon?: {
            requiredHands: number;
            skill: string;
            attackBonus: number;
            damage: string;
            criticalRange: number;
            fumbleRange: number;
        };
        armor?: {
            armorType: number;
            maneuverModifier: number;
        };
    }>;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * Use case for equipping an item to a character in a tactical game.
 * This use case handles the business logic for equipment validation,
 * slot management, and character attribute recalculation.
 */
export class CharacterEquipItemUseCase {
    constructor(
        private readonly tacticalCharacterRepository: TacticalCharacterRepository,
        private readonly characterProcessorService: CharacterProcessorService,
        private readonly logger: Logger
    ) { }

    async execute(command: CharacterEquipItemCommand): Promise<EquippedCharacter> {
        this.logger.info(`Equipping item ${command.itemId} to character ${command.characterId}${command.slot ? ` in slot ${command.slot}` : ''}`);

        // Validate command
        if (!command.itemId) {
            this.logger.error('Missing required itemId');
            throw new Error('Required itemId');
        }

        // Find character
        const character = await this.tacticalCharacterRepository.findById(command.characterId);
        if (!character) {
            this.logger.error(`Tactical character not found: ${command.characterId}`);
            throw new Error('Tactical character not found');
        }

        // Validate equipment data
        this.validateEquipmentData(character, command);

        // Apply equipment logic
        this.applyEquipmentLogic(character, command);

        // Process character attributes
        this.characterProcessorService.process(character);

        // Save character
        const updatedCharacter = await this.tacticalCharacterRepository.update(command.characterId, character);

        if (!updatedCharacter) {
            this.logger.error(`Failed to update character after equipment: ${command.characterId}`);
            throw new Error('Failed to update character after equipment');
        }

        this.logger.info(`Successfully equipped item ${command.itemId} to character ${command.characterId}`);

        return this.mapToEquippedCharacter(updatedCharacter);
    }

    private validateEquipmentData(character: any, command: CharacterEquipItemCommand): void {
        const item = character.items.find((e: any) => e.id === command.itemId);
        if (!item) {
            this.logger.error(`Invalid itemId: ${command.itemId}`);
            throw new Error('Invalid itemId');
        }

        if (command.slot) {
            switch (command.slot) {
                case 'mainHand':
                case 'offHand':
                    if (item.category === 'armor') {
                        this.logger.error('Cannot equip armor types in main hand or off-hand');
                        throw new Error('Can not equip armor types in main hand or off-hand');
                    }
                    break;
                case 'body':
                case 'head':
                case 'arms':
                case 'legs':
                    if (item.category !== 'armor') {
                        this.logger.error('Required armor type for the requested slot');
                        throw new Error('Required armor type for the requested slot');
                    }
                    break;
                default:
                    this.logger.error(`Invalid item slot: ${command.slot}`);
                    throw new Error('Invalid item slot');
            }
        }
    }

    private applyEquipmentLogic(character: any, command: CharacterEquipItemCommand): void {
        const item = character.items.find((e: any) => e.id === command.itemId);
        const slot = command.slot;

        // Set armor type if equipping body armor
        if (slot === 'body' && item.armor && item.armor.armorType) {
            character.defense.armorType = item.armor.armorType;
        }

        // Remove item from all slots first (unequip if already equipped)
        const slots = ['mainHand', 'offHand', 'body', 'head', 'arms', 'legs'];
        for (const checkSlot of slots) {
            if (character.equipment[checkSlot] === command.itemId) {
                character.equipment[checkSlot] = null;
            }
        }

        // Equip item to specified slot
        if (slot) {
            character.equipment[slot] = command.itemId;
        }

        // Handle two-handed weapon in main hand
        if (slot === 'mainHand' && item.weapon && item.weapon.requiredHands > 1) {
            character.equipment.offHand = null;
        }

        // Validate two-handed weapon in off-hand (not allowed)
        if (slot === 'offHand' && item.weapon && item.weapon.requiredHands > 1) {
            this.logger.error('Two handed weapons cannot be equipped in offHand slot');
            throw new Error('Two handed weapons cant be equiped in offHand slot');
        }

        // Handle off-hand equipment with two-handed main hand weapon
        if (slot === 'offHand' && character.equipment.mainHand) {
            const mainHandItem = character.items.find((e: any) => e.id === character.equipment.mainHand);
            if (mainHandItem?.weapon && mainHandItem.weapon.requiredHands > 1) {
                character.equipment.mainHand = null;
            }
        }

        // Set default armor type when no body armor is equipped
        if (character.equipment.body === null) {
            character.defense.armorType = 1;
        }
    }

    private mapToEquippedCharacter(character: any): EquippedCharacter {
        return {
            id: character.id || character._id?.toString(),
            name: character.name,
            gameId: character.gameId,
            faction: character.faction,
            equipment: {
                mainHand: character.equipment?.mainHand || null,
                offHand: character.equipment?.offHand || null,
                body: character.equipment?.body || null,
                head: character.equipment?.head || null,
                arms: character.equipment?.arms || null,
                legs: character.equipment?.legs || null,
            },
            defense: {
                armorType: character.defense?.armorType || 1,
                baseDefense: character.defense?.baseDefense || 0,
                penaltyDefense: character.defense?.penaltyDefense || 0,
                customDefense: character.defense?.customDefense || 0,
                totalDefense: character.defense?.totalDefense || 0,
            },
            items: character.items?.map((item: any) => ({
                id: item.id,
                name: item.name,
                category: item.category,
                weight: item.weight,
                weapon: item.weapon ? {
                    requiredHands: item.weapon.requiredHands,
                    skill: item.weapon.skill,
                    attackBonus: item.weapon.attackBonus,
                    damage: item.weapon.damage,
                    criticalRange: item.weapon.criticalRange,
                    fumbleRange: item.weapon.fumbleRange,
                } : undefined,
                armor: item.armor ? {
                    armorType: item.armor.armorType,
                    maneuverModifier: item.armor.maneuverModifier,
                } : undefined,
            })) || [],
            createdAt: character.createdAt,
            updatedAt: character.updatedAt,
        };
    }
}
