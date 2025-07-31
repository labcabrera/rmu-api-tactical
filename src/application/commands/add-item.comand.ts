export interface CharacterAddItemCommand {
    readonly characterId: string;
    readonly item: {
        readonly name?: string;
        readonly itemTypeId: string;
        readonly category: string;
        readonly weapon?: {
            readonly type: string;
            readonly attackTable: string;
            readonly skillId: string;
            readonly fumble: number;
            readonly sizeAdjustment?: number;

        },
        readonly weaponRange?: AddItemRangeEntry[],
        readonly info?: {
            readonly cost: {
                readonly value: number;
                readonly currency: string;
            },
            readonly strength?: number;
            readonly length?: number;
            readonly weight?: number;
            readonly productionTime?: number;
        }
    };
}

export interface AddItemRangeEntry {
    readonly from: number;
    readonly to: number;
    readonly bonus: number;
}