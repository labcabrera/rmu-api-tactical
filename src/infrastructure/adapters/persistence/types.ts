import { Document } from 'mongoose';

// Mongoose Document Models for Infrastructure Layer

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

export interface TacticalCharacterDocument extends Document {
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

export interface TacticalActionDocument extends Document {
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

export interface TacticalCharacterRoundDocument extends Document {
    gameId: string;
    round: number;
    tacticalCharacterId: string;
    initiative?: any;
    actionPoints?: number;
    createdAt?: Date;
    updatedAt?: Date;
}

// Supporting interfaces for Document models
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
