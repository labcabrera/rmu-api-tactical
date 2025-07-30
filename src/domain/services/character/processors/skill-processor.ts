import { TacticalCharacter } from '../../../entities/tactical-character.entity';

export class SkillProcessor {
    static process(character: TacticalCharacter): void {
        character.skills.forEach((skill: any) => this.updateSkill(character, skill));
    }

    private static updateSkill(character: TacticalCharacter, skill: any): void {
        const ranks = skill.ranks;
        const statBonus = this.getStatBonus(character, skill.statistics);
        const racialBonus = skill.racialBonus || 0;
        const developmentBonus = this.getRankBonus(ranks);
        const customBonus = skill.customBonus || 0;
        const totalBonus = statBonus + racialBonus + developmentBonus + customBonus;

        skill.statBonus = statBonus;
        skill.developmentBonus = developmentBonus;
        skill.totalBonus = totalBonus;
    }

    private static getStatBonus(character: TacticalCharacter, statistics: string[]): number {
        let statBonus = 0;
        statistics?.forEach(stat => {
            const statValue = (character.statistics as any)[stat];
            if (statValue?.totalBonus) {
                statBonus += statValue.totalBonus;
            }
        });
        return statBonus;
    }

    private static getRankBonus(ranks: number): number {
        return ranks > 0 ? ranks * 5 : -20;
    }
}
