export interface TacticalCharacterEntity {
    id: string;
    gameId: string;
    name: string;
    faction: string;
    info: CharacterInfo;
    statistics: CharacterStatistics;
    movement: CharacterMovement;
    defense: CharacterDefense;
    hp: CharacterHP;
    endurance: CharacterEndurance;
    power?: CharacterPower
    initiative: CharacterInitiative;
    skills: CharacterSkill[];
    items: CharacterItem[];
    equipment: CharacterEquipment;


    status?: string;
    position?: {
        x?: number;
        y?: number;
        z?: number;
    };
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CharacterInfo {
    level: number;
    race: string;
    sizeId: string;
    height: number;
    weight: number;
}

export interface Stat {
    bonus: number;
    racial: number;
    custom: number;
    totalBonus: number;
}

export interface CharacterStatistics {
    [key: string]: Stat;
}

export interface CharacterMovement {
    baseMovementRate: number;
    strideRacialBonus: number;
    strideQuBonus: number;
    strideCustomBonus: number;
}

export interface CharacterDefense {
    armorType: number;
    defensiveBonus: number;
}

export interface CharacterHP {
    max: number;
    current: number;
}

export interface CharacterEndurance {
    max: number;
    current: number;
    accumulator: number;
    fatiguePenalty: number;
}

export interface CharacterPower {
    max: number;
    current: number;
}

export interface CharacterInitiative {
    baseBonus: number;
    customBonus: number;
    penaltyBonus: number;
    totalBonus: number;
}

export interface CharacterSkill {
    skillId: string;
    specialization: string | null;
    statistics: string[];
    ranks: number;
    statBonus: number;
    racialBonus: number;
    developmentBonus: number;
    customBonus: number;
    totalBonus: number;
}

export interface CharacterItem {
    id?: string;
    name?: string;
    itemTypeId?: string;
    category?: string;
    weapon?: CharacterItemWeapon;
    weaponRange?: CharacterItemWeaponRange;
    info?: CharacterItemInfo;
}

export interface CharacterItemWeapon {
    attackTable: string
    skillId: string
    fumble: number
    sizeAdjustment: number
    requiredHands: number
    throwable: boolean
}

export interface CharacterItemWeaponRange {
    [key: string]: number;
}

export interface CharacterItemInfo {
    length: number;
    strength: number;
    weight: number;
    productionTime: number;
}

export interface CharacterEquipment {
    mainHand?: string;
    offHand?: string;
    body?: string;
    head?: string;
    weight: number;
}

//TODO refactor this

export interface TacticalCharacterSearchCriteria {
    searchExpression?: string;
    tacticalGameId?: string;
    page: number;
    size: number;
}

export interface CreateTacticalCharacterCommand {
    user: string;
    gameId: string;
    faction: string;
    name: string;
    info: CharacterInfo
    statistics: CharacterStatistics;
    movement: {
        strideCustomBonus?: number;
        strideRacialBonus?: number;
    };
    endurance: {
        max: number;
    };
    hp: {
        max: number;
    };
    skills?: any;
    items?: CreateTacticalCharacterItem[];
}

export interface CreateTacticalCharacterItem {
    name: string;
    itemTypeId: string;
    category: string;
    attackTable: string;
    skillId: string;
}

export interface UpdateTacticalCharacterCommand {
    name?: string;
    faction?: string;
    hitPoints?: number;
    maxHitPoints?: number;
    initiative?: number;
    status?: string;
    // position?: {
    //     x?: number;
    //     y?: number;
    //     z?: number;
    // };
    // skills?: Array<{
    //     name: string;
    //     value: number;
    //     modifier?: number;
    // }>;
    // equipment?: Array<{
    //     name: string;
    //     type: string;
    //     equipped: boolean;
    //     properties?: any;
    // }>;
}



