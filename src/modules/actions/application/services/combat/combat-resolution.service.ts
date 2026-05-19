import { Inject, Injectable } from '@nestjs/common';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import { UnprocessableEntityError } from '../../../../shared/domain/errors';
import { ActionAttackCalculated } from '../../../domain/value-objects/action-attack-calculated.vo';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import type { AttackPort } from '../../ports/attack.port';
import { AttackCreationRequest, AttackRollModifiers, AttackSituationalModifiers } from '../../ports/attack.port';
import { CombatContext, CombatPrepareAttackInput, CombatResolutionInput } from './combat-context';
import { CombatRulesEngineService } from './plugins/combat-rules-engine.service';
import { CombatAttackRollProcessorService } from './processors/combat-attack-roll-processor.service';
import { CombatContextFactoryService } from './processors/combat-context-factory.service';
import { CombatCriticalProcessorService } from './processors/combat-critical-processor.service';
import { CombatDamageProcessorService } from './processors/combat-damage-processor.service';
import { CombatTableLookupProcessorService } from './processors/combat-table-lookup-processor.service';

@Injectable()
export class CombatResolutionService {
  constructor(
    @Inject('AttackPort') private readonly attackClient: AttackPort,
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

  async prepareAttack(input: CombatPrepareAttackInput): Promise<CombatContext> {
    let ctx: CombatContext = {
      action: input.action,
      attack: input.attack,
      actors: input.actors,
      sourceSkills: input.sourceSkills,
      attackNumber: input.attackNumber,
      targetsNumber: input.targetsNumber,
      gameLethality: input.gameLethality,
      trace: [],
    };

    ctx = await this.rulesEngine.runHook('combat.beforePrepare', ctx);
    ctx.attackRequest = this.mapAttackToPortModel(ctx);
    ctx = await this.rulesEngine.runHook('combat.afterPrepare', ctx);

    const attackRequest = ctx.attackRequest!;
    ctx.attackResponse = await this.attackClient.prepareAttack(attackRequest);
    ctx.attack!.externalAttackId = ctx.attackResponse.id;
    ctx.attack!.status = ctx.attackResponse.status;
    ctx.attack!.calculated = new ActionAttackCalculated(
      ctx.attackResponse.calculated.rollModifiers,
      ctx.attackResponse.calculated.rollTotal,
      undefined,
      this.requiresLocationRoll(ctx),
    );

    return ctx;
  }

  private mapAttackToPortModel(ctx: CombatContext): AttackCreationRequest {
    const attack = ctx.attack!;
    const action = ctx.action;
    const attackModifiers = attack.modifiers;
    const actorRoundSource = ctx.actors!.find(a => a.actorId === action.actorId)!;
    const actorRoundTarget = ctx.actors!.find(a => a.actorId === attackModifiers.targetId)!;

    const isMeleeAttack = attack.type === 'melee';
    const attackInfo = actorRoundSource?.attacks?.find(a => a.attackName === attack.attackName);
    if (!attackInfo) throw new UnprocessableEntityError('Attack not found on actor');

    const actionPoints = action.freeAction ? (isMeleeAttack ? 4 : 3) : action.actionPoints!;
    const offHand = attack.modifiers.offHand || attack.attackName.toLowerCase().includes('off-hand');
    const rangePenalty = this.calculateRangePenalty(attack, actorRoundSource);
    const shield = this.getShieldBonus(actorRoundTarget, attackModifiers.disabledShield || false);

    const attackSize = 2;
    const defenderSize = 2;
    const sizeDifference = attackSize - defenderSize;

    const rollModifiers = {
      bo: attackModifiers.bo,
      bd: actorRoundTarget.defense.bd,
      calledShot: attackModifiers.calledShot,
      calledShotPenalty: attackModifiers.calledShotPenalty,
      injuryPenalty: 0,
      fatiguePenalty: 0,
      rangePenalty,
      shield,
      parry: 0,
      attackNumber: ctx.attackNumber,
      attackTargets: ctx.targetsNumber,
      gameLethality: ctx.gameLethality,
      customBonus: attackModifiers.customBonus,
    } as AttackRollModifiers;

    const situationalModifiers = {
      cover: attackModifiers.cover || 'none',
      restrictedQuarters: attackModifiers.restrictedQuarters || 'none',
      positionalSource: attackModifiers.positionalSource || 'none',
      positionalTarget: attackModifiers.positionalTarget || 'none',
      dodge: attackModifiers.dodge || 'none',
      disabledDB: attackModifiers.disabledDB || false,
      disabledShield: attackModifiers.disabledShield || false,
      disabledParry: attackModifiers.disabledParry || false,
      sizeDifference,
      offHand,
      twoHandedWeapon: false,
      higherGround: attackModifiers.higherGround || false,
      sourceStatus: this.mapActorSourceRoundEffects(actorRoundSource, attack),
      targetStatus: this.mapActorTargetRoundEffects(actorRoundTarget, attack),
    } as AttackSituationalModifiers;

    return {
      gameId: action.gameId,
      actionId: action.id,
      sourceId: action.actorId,
      targetId: attackModifiers.targetId!,
      modifiers: {
        attackType: attack.type,
        attackTable: attackInfo.attackTable,
        attackSize: attackInfo.attackSize,
        fumbleTable: attackInfo.fumbleTable,
        fumble: attackInfo.fumble,
        actionPoints,
        calledShot: attackModifiers.calledShot,
        armor: {
          at: actorRoundTarget.defense.at,
          headAt: actorRoundTarget.defense.headAt,
          bodyAt: actorRoundTarget.defense.bodyAt,
          armsAt: actorRoundTarget.defense.armsAt,
          legsAt: actorRoundTarget.defense.legsAt,
        },
        rollModifiers,
        situationalModifiers,
        features: [],
        sourceSkills: ctx.sourceSkills || [],
      },
    };
  }

  private calculateRangePenalty(attack: ActionAttack, sourceActor: ActorRound): number {
    if (attack.type === 'melee' || attack.modifiers.range === undefined) {
      return 0;
    }

    const sourceAttack = sourceActor.attacks?.find(a => a.attackName === attack.attackName);
    if (!sourceAttack) {
      throw new UnprocessableEntityError(`Attack ${attack.attackName} not found on actor`);
    }
    return sourceAttack.calculateRangeBonus(attack.modifiers.range);
  }

  private getShieldBonus(targetActor: ActorRound, disabledShield: boolean): number {
    if (disabledShield || !targetActor.defense.shield) return 0;
    const shield = targetActor.defense.shield;
    if (shield.currentBlocks >= shield.blockCount) return 0;
    return shield.db;
  }

  private requiresLocationRoll(ctx: CombatContext): boolean {
    if (ActionAttack.isCalledShot(ctx.attack!)) {
      return false;
    }

    const target = ctx.actors!.find(a => a.actorId === ctx.attack!.modifiers.targetId)!;
    return !target.defense.at;
  }

  private mapActorSourceRoundEffects(actorRound: ActorRound, attack: ActionAttack): string[] {
    const effects = actorRound.effects?.map(effect => effect.status) || [];
    if (attack.modifiers.proneSource) effects.push('prone');
    if (attack.modifiers.attackerInMelee) effects.push('melee');
    return effects;
  }

  private mapActorTargetRoundEffects(actorRound: ActorRound, attack: ActionAttack): string[] {
    const effects = actorRound.effects?.map(effect => effect.status) || [];
    if (attack.modifiers.proneTarget) effects.push('prone');
    if (attack.modifiers.surprisedFoe) effects.push('surprised');
    if (attack.modifiers.stunnedFoe) effects.push('stunned');
    return effects;
  }
}
