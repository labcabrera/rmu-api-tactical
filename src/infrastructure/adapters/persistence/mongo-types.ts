import { Document } from "mongoose";

export interface TacticalGameDocument extends Document {
  name: string;
  user: string;
  status?: string;
  round: number;
  phase?: string;
  factions: string[];
  description?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CharacterDocument extends Document {
  gameId: string;
  name: string;
  faction?: string;
  hitPoints?: number;
  maxHitPoints?: number;
  initiative?: number;
  status?: string;
  skills?: ISkill[];
  equipment?: IEquipment[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ActionDocument extends Document {
  gameId: string;
  characterId: string;
  round: number;
  actionType: string;
  phaseStart?: string;
  actionPoints?: number;
  attackInfo?: any;
  attacks?: any[];
  description?: string;
  result?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CharacterRoundDocument extends Document {
  gameId: string;
  round: number;
  characterId: string;
  initiative?: any;
  actionPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface ISkill {
  name: string;
  value: number;
  modifier?: number;
}

export interface IEquipment {
  name: string;
  type: string;
  equipped: boolean;
  properties?: any;
}
