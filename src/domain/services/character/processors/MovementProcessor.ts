import { TacticalCharacterEntity } from '../../../entities/tactical-character.entity';

export class MovementProcessor {
    static process(character: TacticalCharacterEntity): void {
        const customStrideBonus = character.movement.strideCustomBonus || 0;
        const racialStrideBonus = character.movement.strideRacialBonus || 0;
        const quBonus = (character.statistics.qu?.totalBonus || 0) / 2;

        const baseMovementRate = 20 + racialStrideBonus + customStrideBonus + quBonus;
        character.movement = {
            ...character.movement,
            strideQuBonus: quBonus,
            baseMovementRate: baseMovementRate
        };
    }
}
