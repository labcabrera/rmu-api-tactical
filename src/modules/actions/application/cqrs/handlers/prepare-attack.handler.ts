import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, UnprocessableEntityError, ValidationError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import { StrategicGameApiClient } from '../../../../strategic/infrastructure/api-clients/api.strategic-game.adapter';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionAttackCalculated } from '../../../domain/value-objects/action-attack-calculated.vo';
import { ActionAttackModifiers } from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import { KeyValueModifier } from '../../../domain/value-objects/key-value-modifier.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type {
  CombatAttackCalculatedResult,
  CombatAttackPreparation,
  CombatAttackRollModifiers,
  CombatAttackSituationalModifiers,
  CombatAttackSourceSkill,
  CombatContext,
} from '../../services/combat';
import { CombatProcessor } from '../../services/combat';
import { PrepareAttackCommand, PrepareAttackCommandItem } from '../commands/prepare-attack.command';

@CommandHandler(PrepareAttackCommand)
export class PrepareAttackHandler implements ICommandHandler<PrepareAttackCommand, Action> {
  private readonly logger = new Logger(PrepareAttackHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('StrategicGameClient') private readonly strategicGameClient: StrategicGameApiClient,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    private readonly combatProcessor: CombatProcessor,
  ) {}

  async execute(command: PrepareAttackCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new UnprocessableEntityError('Game not found');

    const strategicGame = await this.strategicGameClient.findById(game.strategicGameId);
    if (!strategicGame) throw new NotFoundError('StrategicGame', game.strategicGameId);

    game.checkValidActionManagement();
    action.setActionPoints(game.getActionPhase());

    const actorRoundIds = this.getActorIds(action, command);
    const actors = await this.actorRoundRepository.findByGameAndRoundAndActors(game.id, game.round, actorRoundIds);
    if (actorRoundIds.length !== actors.length) throw new UnprocessableEntityError('Missing actors in the current round');

    const sourceActorRound = actors.find(a => a.actorId === action.actorId)!;
    const actionAttacks = command.attacks.map(attack => this.mapAttacks(attack, action, sourceActorRound));

    const skills = await this.getSourceSkills(action.actorId, actors);
    const gameLethality = strategicGame.options?.lethality || 0;
    const attackNumber = command.attacks.length;
    const targets: Set<string> = new Set();
    command.attacks.forEach(a => targets.add(a.modifiers.targetId));
    const targetsNumber = targets.size;

    await Promise.all(
      actionAttacks.map(attack =>
        this.prepareAttack({
          action,
          attack,
          actors,
          sourceSkills: skills,
          attackNumber,
          targetsNumber,
          gameLethality,
        }),
      ),
    );
    action.attacks = actionAttacks;
    //TODO read actions
    const targetActions = await this.actionRepository
      .findByRsql(`gameId==${action.gameId};round==${game.round};actorId=in=(${Array.from(actorRoundIds).join(',')})`, 0, 1000)
      .then(res => res.content);

    const targetActors = actors.filter(a => a.actorId !== action.actorId);
    action.processParryOptions(targetActors, targetActions);

    //TODO check effects and intermediate actions
    action.actionPoints = game.getActionPhase() - action.phaseStart + 1;
    action.status = action.parries?.length && action.parries.length > 0 ? 'parry' : 'pending_attack_roll';

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private async prepareAttack(input: {
    action: Action;
    attack: ActionAttack;
    actors: ActorRound[];
    sourceSkills: CombatAttackSourceSkill[];
    attackNumber: number;
    targetsNumber: number;
    gameLethality: number;
  }): Promise<CombatContext> {
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

    ctx.attackPreparation = this.mapAttackPreparation(ctx);
    ctx = await this.combatProcessor.runPhase('prepare', ctx);

    ctx.attackCalculation = this.calculatePreparedAttack(ctx);
    ctx.attack!.status = ctx.attackCalculation.status;
    ctx.attack!.calculated = new ActionAttackCalculated(
      ctx.attackCalculation.calculated.rollModifiers,
      ctx.attackCalculation.calculated.rollTotal,
      undefined,
      this.requiresLocationRoll(ctx),
    );

    return ctx;
  }

  private getActorIds(action: Action, command: PrepareAttackCommand): string[] {
    const targetIds = command.attacks.map(a => a.modifiers.targetId);
    const protectors = command.attacks.flatMap(a => a.protectors || []);
    return Array.from(new Set([...targetIds, ...protectors, action.actorId]));
  }

  private async getSourceSkills(sourceActorId: string, actors: ActorRound[]): Promise<CombatAttackSourceSkill[]> {
    const actor = actors.find(a => a.actorId === sourceActorId);
    //TODO NPCs
    const character = await this.characterClient.findById(actor?.actorId || '');
    return (
      character?.skills
        .filter(skill => this.isCombatSkill(skill.skillId))
        .map(skill => ({ skillId: skill.skillId, bonus: skill.totalBonus })) || []
    );
  }

  private isCombatSkill(skillId: string): boolean {
    const combatSkills = ['multiple-attacks', 'reverse-strike', 'footwork', 'restricted-quarters', 'called-shot'];
    return combatSkills.includes(skillId);
  }

  private mapAttackPreparation(ctx: CombatContext): CombatAttackPreparation {
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
      positionalSource: undefined,
      customBonus: attackModifiers.customBonus,
    } as CombatAttackRollModifiers;

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
    } as CombatAttackSituationalModifiers;

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

  private calculatePreparedAttack(ctx: CombatContext): CombatAttackCalculatedResult {
    const preparation = ctx.attackPreparation!;
    const rollModifiers = this.mapRollModifiers(preparation.modifiers.rollModifiers);

    return {
      calculated: {
        rollModifiers,
        rollTotal: this.calculateRollTotal(rollModifiers),
      },
      results: undefined,
      status: 'pending_attack_roll',
    };
  }

  private mapRollModifiers(modifiers: CombatAttackRollModifiers): KeyValueModifier[] {
    return [
      new KeyValueModifier('bo', modifiers.bo || 0),
      new KeyValueModifier('bd', -modifiers.bd),
      new KeyValueModifier('calledShotPenalty', -(modifiers.calledShotPenalty || 0)),
      new KeyValueModifier('injuryPenalty', -modifiers.injuryPenalty),
      new KeyValueModifier('fatiguePenalty', -modifiers.fatiguePenalty),
      new KeyValueModifier('rangePenalty', modifiers.rangePenalty || 0),
      new KeyValueModifier('shield', -(modifiers.shield || 0)),
      new KeyValueModifier('parry', -(modifiers.parry || 0)),
      new KeyValueModifier('attackNumber', this.calculateRepeatedAttackPenalty(modifiers.attackNumber)),
      new KeyValueModifier('attackTargets', this.calculateMultipleTargetPenalty(modifiers.attackTargets)),
      new KeyValueModifier('gameLethality', modifiers.gameLethality || 0),
      new KeyValueModifier('positionalSource', modifiers.positionalSource || 0),
      new KeyValueModifier('customBonus', modifiers.customBonus || 0),
    ].filter(modifier => modifier.value !== 0);
  }

  private calculateRollTotal(modifiers: KeyValueModifier[]): number {
    return modifiers.reduce((sum, modifier) => sum + modifier.value, 0);
  }

  private calculateRepeatedAttackPenalty(attackNumber: number | undefined): number {
    if (!attackNumber || attackNumber <= 1) {
      return 0;
    }
    return -(attackNumber - 1) * 10;
  }

  private calculateMultipleTargetPenalty(targetsNumber: number | undefined): number {
    if (!targetsNumber || targetsNumber <= 1) {
      return 0;
    }
    return -(targetsNumber - 1) * 10;
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

  private mapAttacks(commandAttack: PrepareAttackCommandItem, action: Action, source: ActorRound): ActionAttack {
    const attack = source.attacks?.find(a => a.attackName === commandAttack.attackName);
    if (!attack) {
      throw new UnprocessableEntityError(`Attack ${commandAttack.attackName} not found on actor`);
    }
    if (commandAttack.modifiers.bo > attack.currentBo) {
      throw new ValidationError(`BO cannot be higher than current BO (${attack.currentBo})`);
    }
    const parry = 0;
    const surprisedFoe = commandAttack.modifiers.surprisedFoe || false;
    // Stun cannot be applied if surprised is applied
    const stunnedFoe = (!surprisedFoe && commandAttack.modifiers.stunnedFoe) || false;
    const modifiers = new ActionAttackModifiers(
      commandAttack.modifiers.targetId,
      commandAttack.modifiers.bo,
      parry,
      commandAttack.modifiers.calledShot || 'none',
      commandAttack.modifiers.calledShotPenalty || 0,
      commandAttack.modifiers.positionalSource || 'none',
      commandAttack.modifiers.positionalTarget || 'none',
      commandAttack.modifiers.restrictedQuarters || 'none',
      commandAttack.modifiers.cover || 'none',
      commandAttack.modifiers.dodge || 'none',
      commandAttack.modifiers.disabledDB,
      commandAttack.modifiers.disabledShield,
      commandAttack.modifiers.disabledParry,
      commandAttack.modifiers.pace,
      commandAttack.modifiers.restrictedParry,
      commandAttack.modifiers.higherGround,
      stunnedFoe,
      surprisedFoe,
      commandAttack.modifiers.proneSource,
      commandAttack.modifiers.proneTarget,
      commandAttack.modifiers.attackerInMelee,
      commandAttack.modifiers.offHand,
      commandAttack.modifiers.ambush,
      commandAttack.modifiers.range,
      commandAttack.modifiers.customBonus,
    );
    return new ActionAttack(
      commandAttack.attackName,
      attack.type,
      modifiers,
      undefined,
      undefined,
      undefined,
      undefined,
      'pending_attack_roll',
      commandAttack.protectors,
    );
  }
}
