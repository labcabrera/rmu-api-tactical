import { Injectable, Logger } from '@nestjs/common';
import { CombatContext } from '../combat-context';
import { CombatHookName } from '../combat-hooks';
import { CombatPluginRegistryService } from './combat-plugin-registry.service';

@Injectable()
export class CombatRulesEngineService {
  private readonly logger = new Logger(CombatRulesEngineService.name);

  constructor(private readonly registry: CombatPluginRegistryService) {}

  async runHook<TContext extends CombatContext>(hookName: CombatHookName, context: TContext): Promise<TContext> {
    let current = context;

    for (const hook of this.registry.getHooks(hookName)) {
      const applies = hook.condition ? await hook.condition(current) : true;
      if (!applies) {
        continue;
      }

      this.logger.debug(`Applying combat hook ${hookName} from plugin ${hook.plugin.id}`);
      current = (await hook.apply(current)) as TContext;
    }

    return current;
  }
}
