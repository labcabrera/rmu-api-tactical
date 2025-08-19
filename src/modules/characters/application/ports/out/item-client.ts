export interface ItemResponse {
  id: string;
  category: string;
  weapon: ItemWeaponResponse | undefined;
  weaponRange: ItemWeaponRangeResponse[] | undefined;
  armor: ItemArmorResponse | undefined;
  info: ItemInfoResponse;
}

export interface ItemWeaponResponse {
  attackTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
  throwable: boolean;
}

export interface ItemInfoResponse {
  cost: {
    value: number;
    type: string;
  };
  length: number;
  strength: number;
  weight: number;
  productionTime: number;
}

export interface ItemArmorResponse {
  slot: string;
  armorType: number;
  enc: number;
  maneuver: number;
  rangedPenalty: number;
  perception: number;
}

export interface ItemWeaponRangeResponse {
  from: number;
  to: number;
  bonus: number;
}

export interface ItemClient {
  getItemById(itemId: string): Promise<ItemResponse>;
}
