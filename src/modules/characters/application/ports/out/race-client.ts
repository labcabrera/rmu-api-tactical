export interface RaceResponse {
  id: string;
  name: string;
  realm: string;
  defaultStatBonus: any;
  resistances: any;
  averageHeight: any;
  averageWeight: any;
  strideBonus: number;
  enduranceBonus: number;
  recoveryMultiplier: number;
  baseHits: number;
  bonusDevPoints: number;
  description: string;
}

export interface RaceClient {
  //TODO change any to a specific type
  getRaceById(raceId: string): Promise<RaceResponse>;
}
