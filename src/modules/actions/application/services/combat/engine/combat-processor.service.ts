import { Injectable } from '@nestjs/common';
import type { CombatContext } from '../combat-context.js';
import type { CombatPhase } from '../combat-phase.js';
import { SkippedRule } from '../../../../domain/value-objects/skipped-rule.vo.js';
import { CombatPluginRegistryService } from './combat-plugin-registry.service.js';

/** Runs the hooks of a phase in order, skipping the ones whose condition does not hold, and traces them. */
@Injectable()
export class CombatProcessor {
  constructor(private readonly registry: CombatPluginRegistryService) {}

  async runPhase(phase: CombatPhase, ctx: CombatContext): Promise<CombatContext> {
    let current = ctx;

    for (const hook of this.registry.getPhaseHooks(phase)) {
      const applies = hook.condition ? await hook.condition(current) : true;
      if (applies !== true) {
        if (applies) {
          const { id, group, rule } = hook.plugin;
          (current.skipped ??= []).push(new SkippedRule(id, group, applies.skip, phase, rule, applies.params));
        }
        continue;
      }

      current.plugin = { source: hook.plugin.id, group: hook.plugin.group, rule: hook.plugin.rule };
      current = (await hook.apply(current)) || current;
      current.trace.push({ source: hook.plugin.id, message: phase });
    }
    current.plugin = undefined;

    return current;
  }
}
