import { Injectable } from '@nestjs/common';
import { CombatContext } from '../combat-context';

@Injectable()
export class CombatDamageProcessorService {
  process(ctx: CombatContext): CombatContext {
    return ctx;
  }
}
