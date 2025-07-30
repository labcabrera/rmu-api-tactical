export interface TacticalActionEntity {
    id: string;
    tacticalGameId: string;
    tacticalCharacterId: string;
    characterId?: string; // For backward compatibility
    round: number;
    type: string;
    phaseStart?: string;
    actionPoints?: number;
    attackInfo?: TacticalActionAttackInfo;
    attacks?: TacticalActionAttack[];
    description?: string;
    result?: TacticalActionResult;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface TacticalActionAttackInfo {
    weaponId?: string;
    targetId?: string;
    attackType?: string;
    bonus?: number;
    [key: string]: any;
}

export interface TacticalActionAttack {
    roll: number;
    bonus: number;
    total: number;
    result?: string;
    damage?: TacticalActionDamage;
    [key: string]: any;
}

export interface TacticalActionDamage {
    points: number;
    type?: string;
    location?: string;
    [key: string]: any;
}

export interface TacticalActionResult {
    success: boolean;
    description?: string;
    effects?: TacticalActionEffect[];
    [key: string]: any;
}

export interface TacticalActionEffect {
    type: string;
    duration?: number;
    value?: number;
    target?: string;
    [key: string]: any;
}

export interface TacticalActionSearchCriteria {
    tacticalGameId?: string;
    tacticalCharacterId?: string;
    characterId?: string;
    round?: number;
    type?: string;
    phaseStart?: string;
    hasAttacks?: boolean;
    hasResult?: boolean;
    createdBefore?: Date;
    createdAfter?: Date;
    limit?: number;
    offset?: number;
}

export interface CreateTacticalActionCommand {
    tacticalGameId: string;
    tacticalCharacterId: string;
    characterId?: string;
    round: number;
    type: string;
    phaseStart?: string;
    actionPoints?: number;
    attackInfo?: TacticalActionAttackInfo;
    description?: string;
}

export interface UpdateTacticalActionCommand {
    type?: string;
    phaseStart?: string;
    actionPoints?: number;
    attackInfo?: TacticalActionAttackInfo;
    attacks?: TacticalActionAttack[];
    description?: string;
    result?: TacticalActionResult;
}
