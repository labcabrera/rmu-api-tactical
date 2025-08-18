export interface ItemResponse {
  id: string;
  category: string;
  weapon: ItemWeaponResponse | undefined;
  info: ItemInfoResponse;
}

export interface ItemWeaponResponse {
  attackTable: string;
  skillId: string;
  fumble: number;
  sizeAdjustment: number;
  requiredHands: number;
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

export interface ItemClient {
  getItemById(itemId: string): Promise<ItemResponse>;
}
