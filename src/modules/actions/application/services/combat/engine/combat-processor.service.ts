import { Injectable } from '@nestjs/common';
import { CombatContext } from '../combat-context';
import { CombatPhase } from '../combat-phase';
import { CombatPluginRegistryService } from './combat-plugin-registry.service';

@Injectable()
export class CombatProcessor {
  constructor(private readonly registry: CombatPluginRegistryService) {}

  async runPhase(phase: CombatPhase, ctx: CombatContext): Promise<CombatContext> {
    let current = ctx;

    for (const hook of this.registry.getPhaseHooks(phase)) {
      const applies = hook.condition ? await hook.condition(current) : true;
      if (!applies) {
        continue;
      }

      current = await hook.apply(current);
    }

    return current;
  }
}
