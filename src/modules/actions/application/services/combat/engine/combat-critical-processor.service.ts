import { Injectable } from '@nestjs/common';
import { CombatContext } from '../combat-context';

@Injectable()
export class CombatCriticalProcessorService {
  process(ctx: CombatContext): CombatContext {
    return ctx;
  }
}
