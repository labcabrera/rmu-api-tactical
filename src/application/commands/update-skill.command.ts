export interface UpdateSkillCommand {
    readonly characterId: string;
    readonly skillId: string;
    readonly ranks?: number;
    readonly customBonus?: number;
}