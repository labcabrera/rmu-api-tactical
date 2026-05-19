import { Injectable } from '@nestjs/common';
import { CombatContext, CombatResolutionInput } from '../combat-context';

@Injectable()
export class CombatContextFactoryService {
  create(input: CombatResolutionInput): CombatContext {
    return {
      action: input.action,
      attack: input.attack,
      attackRoll: input.attackRoll,
      locationRoll: input.locationRoll,
      criticalKey: input.criticalKey,
      criticalRoll: input.criticalRoll,
      fumbleRoll: input.fumbleRoll,
      trace: [],
    };
  }
}
