import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, UnprocessableEntityError, ValidationError } from '../../../../shared/domain/errors';
import type { Character, CharacterPort } from '../../../../strategic/application/ports/character.port';
import { StrategicGameApiClient } from '../../../../strategic/infrastructure/api-clients/api.strategic-game.adapter';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionAttackCalculated } from '../../../domain/value-objects/action-attack-calculated.vo';
import {
  ActionAttackModifiers,
  Cover,
  Dodge,
  normalizeChargeSpeed,
  PositionalTarget,
  RestrictedQuarters,
} from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type {
  CombatAttackCalculatedResult,
  CombatAttackPreparation,
  CombatAttackSituationalModifiers,
  CombatAttackSourceSkill,
  CombatAttackSourceTrait,
  CombatContext,
} from '../../services/combat';
import { COMBAT_SKILL_IDS, CombatModifierBag, CombatProcessor, sizeDifference } from '../../services/combat';
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

    const sourceActor = actors.find(a => a.actorId === action.actorId);
    const sourceCharacter = await this.characterClient.findById(sourceActor?.actorId || '');
    const skills = this.mapSourceSkills(sourceCharacter);
    const traits = this.mapSourceTraits(sourceCharacter);
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
          sourceTraits: traits,
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
    action.markPrepared();

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
    sourceTraits: CombatAttackSourceTrait[];
    attackNumber: number;
    targetsNumber: number;
    gameLethality: number;
  }): Promise<CombatContext> {
    let ctx: CombatContext = {
      action: input.action,
      attack: input.attack,
      actors: input.actors,
      sourceSkills: input.sourceSkills,
      sourceTraits: input.sourceTraits,
      attackNumber: input.attackNumber,
      targetsNumber: input.targetsNumber,
      gameLethality: input.gameLethality,
      sourceActor: input.actors.find(a => a.actorId === input.action.actorId),
      targetActor: input.actors.find(a => a.actorId === input.attack.modifiers.targetId),
      trace: [],
    };
    ctx.sourceAttack = ctx.sourceActor?.attacks?.find(a => a.attackName === input.attack.attackName);
    if (!ctx.sourceActor || !ctx.targetActor || !ctx.sourceAttack) throw new UnprocessableEntityError('Attack not found on actor');

    ctx.attackPreparation = this.mapAttackPreparation(ctx);
    ctx = await this.combatProcessor.runPhase('prepare', ctx);

    ctx.attackCalculation = this.calculatePreparedAttack(ctx);
    ctx.attack!.status = ctx.attackCalculation.status;
    ctx.attack!.calculated = new ActionAttackCalculated(
      ctx.attackCalculation.calculated.rollModifiers,
      ctx.attackCalculation.calculated.rollTotal,
      undefined,
      this.requiresLocationRoll(ctx),
      ctx.attackCalculation.calculated.criticalAdjustment,
      ctx.attackCalculation.calculated.criticalModifiers,
    );

    return ctx;
  }

  private getActorIds(action: Action, command: PrepareAttackCommand): string[] {
    const targetIds = command.attacks.map(a => a.modifiers.targetId);
    const protectors = command.attacks.flatMap(a => a.protectors || []);
    return Array.from(new Set([...targetIds, ...protectors, action.actorId]));
  }

  private mapSourceSkills(character: Character | undefined): CombatAttackSourceSkill[] {
    return (
      character?.skills
        .filter(skill => this.isCombatSkill(skill.skillId))
        .map(skill => ({ skillId: skill.skillId, bonus: skill.totalBonus })) || []
    );
  }

  private mapSourceTraits(character: Character | undefined): CombatAttackSourceTrait[] {
    return character?.traits?.map(trait => ({ id: trait.id })) || [];
  }

  private isCombatSkill(skillId: string): boolean {
    return COMBAT_SKILL_IDS.includes(skillId);
  }

  /** The data the prepare plugins read. The modifier lists start empty: every modifier comes from a plugin. */
  private mapAttackPreparation(ctx: CombatContext): CombatAttackPreparation {
    const attack = ctx.attack!;
    const action = ctx.action;
    const attackModifiers = attack.modifiers;
    const actorRoundSource = ctx.sourceActor!;
    const actorRoundTarget = ctx.targetActor!;
    const attackInfo = ctx.sourceAttack!;

    const actionPoints = action.freeAction ? (attack.type === 'melee' ? 4 : 3) : action.actionPoints!;

    const situationalModifiers: CombatAttackSituationalModifiers = {
      cover: (attackModifiers.cover || 'none') as Cover,
      restrictedQuarters: (attackModifiers.restrictedQuarters || 'none') as RestrictedQuarters,
      positionalSource: attackModifiers.positionalSource || 'none',
      positionalTarget: (attackModifiers.positionalTarget || 'none') as PositionalTarget,
      dodge: (attackModifiers.dodge || 'none') as Dodge,
      disabledDB: attackModifiers.disabledDB || false,
      disabledShield: attackModifiers.disabledShield || false,
      disabledParry: attackModifiers.disabledParry || false,
      sizeDifference: sizeDifference(ctx),
      twoHandedWeapon: false,
      higherGround: attackModifiers.higherGround || false,
      sourceStatus: this.mapEffectStatuses(actorRoundSource),
      targetStatus: this.mapEffectStatuses(actorRoundTarget),
    };

    return {
      gameId: action.gameId,
      actionId: action.id,
      sourceId: action.actorId,
      targetId: attackModifiers.targetId!,
      criticalAdjustment: undefined,
      modifiers: {
        attackType: attack.type,
        bo: attackModifiers.bo || 0,
        bd: actorRoundTarget.defense.bd || 0,
        range: attackModifiers.range,
        pace: attackModifiers.pace,
        calledShotPenalty: attackModifiers.calledShotPenalty || 0,
        customBonus: attackModifiers.customBonus || 0,
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
        rollModifiers: [],
        criticalModifiers: [],
        situationalModifiers,
        sourceSkills: ctx.sourceSkills || [],
      },
    };
  }

  private calculatePreparedAttack(ctx: CombatContext): CombatAttackCalculatedResult {
    const preparation = ctx.attackPreparation!;
    const rollModifiers = preparation.modifiers.rollModifiers;
    const criticalModifiers = preparation.modifiers.criticalModifiers;
    const criticalAdjustment = CombatModifierBag.from(criticalModifiers).sum() + (preparation.criticalAdjustment || 0);

    return {
      calculated: {
        rollModifiers,
        criticalModifiers,
        rollTotal: CombatModifierBag.from(rollModifiers).sum(),
        criticalAdjustment: criticalAdjustment || undefined,
      },
      results: undefined,
      status: 'pending_attack_roll',
    };
  }

  private requiresLocationRoll(ctx: CombatContext): boolean {
    if (ActionAttack.isCalledShot(ctx.attack!)) {
      return false;
    }

    const target = ctx.actors!.find(a => a.actorId === ctx.attack!.modifiers.targetId)!;
    return !target.defense.at;
  }

  /** Statuses of the actor's active effects; the statuses declared in the attack modifiers are read by the plugins. */
  private mapEffectStatuses(actorRound: ActorRound): string[] {
    return actorRound.effects?.map(effect => effect.status) || [];
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
      normalizeChargeSpeed(commandAttack.modifiers.chargeSpeed),
    );
    return new ActionAttack(
      commandAttack.attackName,
      attack.type,
      modifiers,
      undefined,
      undefined,
      undefined,
      'pending_attack_roll',
      commandAttack.protectors,
    );
  }
}
