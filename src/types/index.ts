import { Document } from 'mongoose';

export interface TacticalGameModel extends Document {
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

export interface TacticalCharacterModel extends Document {
  gameId: string;
  name: string;
  faction?: string;
  hitPoints?: number;
  maxHitPoints?: number;
  initiative?: number;
  status?: string;
  position?: IPosition;
  skills?: ISkill[];
  equipment?: IEquipment[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TacticalActionModel extends Document {
  tacticalGameId: string;
  round: number;
  tacticalCharacterId: string;
  characterId?: string; // Para compatibilidad con código existente
  type: string;
  phaseStart?: string;
  actionPoints?: number;
  attackInfo?: any;
  attacks?: any[];
  description?: string;
  result?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface TacticalCharacterRoundModel extends Document {
  gameId: string;
  round: number;
  tacticalCharacterId: string;
  initiative?: any;
  actionPoints?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPosition {
  x: number;
  y: number;
  z?: number;
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

export interface ICharacterRound extends Document {
  gameId: string;
  characterId: string;
  round: number;
  initiative?: number;
  actions?: string[];
  status?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IApiError extends Error {
  status?: number;
  code?: string;
}

export interface IApiResponse<T = any> {
  code?: string;
  message?: string;
  data?: T;
  timestamp?: string;
}

export interface IPaginatedResponse<T = any> {
  content: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}
