export interface CharacterAddItemCommand {
    characterId: string;
    item: {
        name?: string;
        itemTypeId: string;
        category: string;
        weapon?: {
            type: string;
            attackTable: string;
            skillId: string;
            fumble: number;
            sizeAdjustment?: number;

        },
        weaponRange?: AddItemRangeEntry[],
        info?: {
            cost: {
                value: number;
                currency: string;
            },
            strength?: number;
            length?: number;
            weight?: number;
            productionTime?: number;
        }
    };
}

export interface AddItemRangeEntry {
    from: number;
    to: number;
    bonus: number;
}