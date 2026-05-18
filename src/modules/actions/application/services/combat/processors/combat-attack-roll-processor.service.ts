import { Injectable } from '@nestjs/common';
import { CombatContext } from '../combat-context';

@Injectable()
export class CombatAttackRollProcessorService {
  process(ctx: CombatContext): CombatContext {
    return ctx;
  }
}
