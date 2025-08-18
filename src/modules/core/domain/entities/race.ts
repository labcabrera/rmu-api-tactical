export interface RaceStatBonus {
  ag: number;
  co: number;
  em: number;
  in: number;
  me: number;
  pr: number;
  qu: number;
  re: number;
  sd: number;
  st: number;
}

export interface RaceResistances {
  channeling: number;
  mentalism: number;
  essence: number;
  physical: number;
}

export interface SexBasedAttribute {
  male: number;
  female: number;
}

export interface Race {
  id: string;
  name: string;
  realm: string;
  size: string;
  defaultStatBonus: RaceStatBonus;
  resistances: RaceResistances;
  averageHeight: SexBasedAttribute;
  averageWeight: SexBasedAttribute;
  strideBonus: number;
  enduranceBonus: number;
  recoveryMultiplier: number;
  baseHits: number;
  bonusDevPoints: number;
  description?: string;
  owner: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UpdateRaceRequest {
  name?: string;
  realm?: string;
  size?: string;
  defaultStatBonus?: RaceStatBonus;
  resistances?: RaceResistances;
  averageHeight?: SexBasedAttribute;
  averageWeight?: SexBasedAttribute;
  strideBonus?: number;
  enduranceBonus?: number;
  recoveryMultiplier?: number;
  baseHits?: number;
  bonusDevPoints?: number;
  description?: string;
}
