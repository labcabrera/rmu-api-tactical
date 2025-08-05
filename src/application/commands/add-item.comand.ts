import {
  CharacterItemArmor,
  CharacterItemInfo,
  CharacterItemWeapon,
  CharacterItemWeaponRange,
} from '@domain/entities/character.entity';

export interface AddItemCommand {
  readonly characterId: string;
  readonly item: {
    readonly name?: string;
    readonly itemTypeId: string;
    readonly category: string;
    readonly weapon?: CharacterItemWeapon;
    readonly weaponRange?: CharacterItemWeaponRange[];
    readonly armor?: CharacterItemArmor;
    readonly info: CharacterItemInfo;
  };
}
