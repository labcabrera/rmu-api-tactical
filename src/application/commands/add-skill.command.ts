export interface AddSkillCommand {
    readonly characterId: string;
    readonly skillId: string;
    readonly specialization?: string;
    readonly ranks: number;
    readonly customBonus?: number;
}
