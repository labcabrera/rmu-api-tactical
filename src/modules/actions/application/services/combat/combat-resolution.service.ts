import { Injectable } from '@nestjs/common';
import { CombatContext, CombatResolutionInput } from './combat-context';
import { CombatRulesEngineService } from './plugins/combat-rules-engine.service';
import { CombatAttackRollProcessorService } from './processors/combat-attack-roll-processor.service';
import { CombatContextFactoryService } from './processors/combat-context-factory.service';
import { CombatCriticalProcessorService } from './processors/combat-critical-processor.service';
import { CombatDamageProcessorService } from './processors/combat-damage-processor.service';
import { CombatTableLookupProcessorService } from './processors/combat-table-lookup-processor.service';

@Injectable()
export class CombatResolutionService {
  constructor(
    private readonly contextFactory: CombatContextFactoryService,
    private readonly rulesEngine: CombatRulesEngineService,
    private readonly attackRollProcessor: CombatAttackRollProcessorService,
    private readonly tableLookupProcessor: CombatTableLookupProcessorService,
    private readonly damageProcessor: CombatDamageProcessorService,
    private readonly criticalProcessor: CombatCriticalProcessorService,
  ) {}

  async resolve(input: CombatResolutionInput): Promise<CombatContext> {
    let ctx = this.contextFactory.create(input);

    ctx = await this.rulesEngine.runHook('combat.beforeResolve', ctx);

    ctx = await this.rulesEngine.runHook('combat.beforeAttackRoll', ctx);
    ctx = this.attackRollProcessor.process(ctx);
    ctx = await this.rulesEngine.runHook('combat.afterAttackRoll', ctx);

    ctx = await this.rulesEngine.runHook('combat.beforeTableLookup', ctx);
    ctx = this.tableLookupProcessor.process(ctx);
    ctx = await this.rulesEngine.runHook('combat.afterTableLookup', ctx);

    ctx = await this.rulesEngine.runHook('combat.beforeDamage', ctx);
    ctx = this.damageProcessor.process(ctx);
    ctx = await this.rulesEngine.runHook('combat.afterDamage', ctx);

    ctx = await this.rulesEngine.runHook('combat.beforeCritical', ctx);
    ctx = this.criticalProcessor.process(ctx);
    ctx = await this.rulesEngine.runHook('combat.afterCritical', ctx);

    return this.rulesEngine.runHook('combat.finalize', ctx);
  }
}
