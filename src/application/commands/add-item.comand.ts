import {
    CharacterItemArmor,
    CharacterItemInfo,
    CharacterItemWeapon,
    CharacterItemWeaponRange
} from '@domain/entities/tactical-character.entity';

export interface CharacterAddItemCommand {
    readonly characterId: string;
    readonly item: {
        readonly name?: string;
        readonly itemTypeId: string;
        readonly category: string;
        readonly weapon?: CharacterItemWeapon;
        readonly weaponRange?: CharacterItemWeaponRange[];
        readonly armor?: CharacterItemArmor;
        readonly info: CharacterItemInfo
    };
}
