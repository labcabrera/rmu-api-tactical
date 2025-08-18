import {
  CharacterItemArmor,
  CharacterItemInfo,
  CharacterItemWeapon,
  CharacterItemWeaponRange,
} from '../../domain/entities/character.entity';

export class AddItemCommand {
  constructor(
    public readonly characterId: string,
    public readonly item: AddItemElement,
  ) {}
}

export class AddItemElement {
  constructor(
    public readonly name: string | undefined,
    public readonly itemTypeId: string,
    public readonly category: string,
    public readonly weapon: CharacterItemWeapon | undefined,
    public readonly weaponRange: CharacterItemWeaponRange[] | undefined,
    public readonly armor: CharacterItemArmor | undefined,
    public readonly info: CharacterItemInfo,
  ) {}
}
