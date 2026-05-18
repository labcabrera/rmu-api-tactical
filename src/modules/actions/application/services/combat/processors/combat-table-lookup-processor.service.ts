import { Injectable } from '@nestjs/common';
import { CombatContext } from '../combat-context';

@Injectable()
export class CombatTableLookupProcessorService {
  process(ctx: CombatContext): CombatContext {
    return ctx;
  }
}
