import { Character } from '../../../../../src/modules/characters/domain/entities/character.entity';

export class MovementProcessor {
  static process(character: Partial<Character>): void {
    if (!character.movement || !character.statistics || !character.statistics.qu) {
      return;
    }
    const customStrideBonus = character.movement.strideCustomBonus || 0;
    const racialStrideBonus = character.movement.strideRacialBonus || 0;
    const quBonus = (character.statistics.qu?.totalBonus || 0) / 2;
    const baseMovementRate = 20 + racialStrideBonus + customStrideBonus + quBonus;
    character.movement = {
      ...character.movement,
      strideQuBonus: quBonus,
      baseMovementRate: baseMovementRate,
    };
  }
}
