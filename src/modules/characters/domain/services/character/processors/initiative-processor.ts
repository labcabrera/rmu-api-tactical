import { Injectable } from '@nestjs/common';

import { Character } from '../../../entities/character.entity';

@Injectable()
export class InitiativeProcessor {
  process(character: Partial<Character>): void {
    if (!character.initiative || !character.statistics || !character.statistics.qu) {
      return;
    }
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
      totalBonus: totalBonus,
    };
  }
}
