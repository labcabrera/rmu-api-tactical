import { TacticalCharacterEntity } from '../../../entities/tactical-character.entity';

export class InitiativeProcessor {
    static process(character: TacticalCharacterEntity): void {
        const baseBonus = character.statistics.qu?.totalBonus || 0;
        const customBonus = character.initiative.customBonus || 0;
        // TODO calculate
        const penaltyBonus = 0;
        const totalBonus = baseBonus + penaltyBonus + customBonus;

        character.initiative = {
            ...character.initiative,
            baseBonus: baseBonus,
            customBonus: customBonus,
            penaltyBonus: penaltyBonus,
            totalBonus: totalBonus
        };
    }
}
