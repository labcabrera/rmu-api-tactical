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
  CombatContext,
  CombatPrepareAttackInput,
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
    const currentPhase = game.getActionPhase();

    const actorRoundIds = this.getActorIds(action, command);
    const actors = await this.actorRoundRepository.findByGameAndRoundAndActors(game.id, game.round, actorRoundIds);
    if (actorRoundIds.length !== actors.length) throw new UnprocessableEntityError('Missing actors in the current round');

    const sourceActorRound = actors.find(a => a.actorId === action.actorId)!;
    // The AP of the attack come from the ledger; below the minimum it cannot be prepared unless forced (spec 011, §4).
    action.checkResolvable(sourceActorRound, currentPhase);
    action.actionPoints = action.apOf(sourceActorRound, currentPhase);
    const actionAttacks = command.attacks.map(attack => this.mapAttacks(attack, action, sourceActorRound));

    const characters = await this.readCharacters(actors, action.actorId);
    const sourceCharacter = characters.get(action.actorId);
    const skills = this.mapSkills(sourceCharacter);
    const gameLethality = strategicGame.options?.lethality || 0;
    const attackNumber = command.attacks.length;
    const targets: Set<string> = new Set();
    command.attacks.forEach(a => targets.add(a.modifiers.targetId));
    const targetsNumber = targets.size;
    const kataAttacks = actionAttacks.map(attack => sourceActorRound.attacks.find(a => a.attackName === attack.attackName)!);
    const roundActions = await this.actionRepository
      .findByRsql(`gameId==${action.gameId};round==${game.round};actorId=in=(${Array.from(actorRoundIds).join(',')})`, 0, 1000)
      .then(res => res.content);

    // One after the other: an attack covered by the target's shield takes one of its blocks for the next ones.
    const reservedShieldBlocks = new Map<string, number>();
    for (const [index, attack] of actionAttacks.entries()) {
      const targetId = attack.modifiers.targetId!;
      const ctx = await this.prepareAttack({
        action,
        attack,
        actors,
        sourceSkills: skills,
        targetSkills: this.mapSkills(characters.get(targetId)),
        roundActions,
        earlierAttacks: actionAttacks.slice(0, index),
        kataAttacks,
        reservedShieldBlocks: reservedShieldBlocks.get(targetId) || 0,
        attackNumber,
        targetsNumber,
        gameLethality,
      });
      if (ctx.attack!.calculated!.rollModifiers.some(modifier => modifier.key === 'shield' || modifier.key === 'shield-block')) {
        reservedShieldBlocks.set(targetId, (reservedShieldBlocks.get(targetId) || 0) + 1);
      }
    }
    action.attacks = actionAttacks;

    const targetActors = actors.filter(a => a.actorId !== action.actorId);
    action.processParryOptions(targetActors, roundActions, currentPhase);
    action.markPrepared();

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    updated.refreshApState(sourceActorRound, currentPhase);
    return updated;
  }

  private async prepareAttack(input: CombatPrepareAttackInput): Promise<CombatContext> {
    let ctx: CombatContext = {
      action: input.action,
      attack: input.attack,
      actors: input.actors,
      sourceSkills: input.sourceSkills,
      targetSkills: input.targetSkills,
      roundActions: input.roundActions,
      earlierAttacks: input.earlierAttacks,
      kataAttacks: input.kataAttacks,
      reservedShieldBlocks: input.reservedShieldBlocks,
      attackNumber: input.attackNumber,
      targetsNumber: input.targetsNumber,
      gameLethality: input.gameLethality,
      sourceActor: input.actors.find(a => a.actorId === input.action.actorId),
      targetActor: input.actors.find(a => a.actorId === input.attack.modifiers.targetId),
      trace: [],
    };
    ctx.sourceAttack = ctx.sourceActor?.attacks?.find(a => a.attackName === input.attack.attackName);
    if (!ctx.sourceActor || !ctx.targetActor || !ctx.sourceAttack) throw new UnprocessableEntityError('Attack not found on actor');
    ctx.sourceTraits = ctx.sourceActor.traits || [];
    ctx.targetTraits = ctx.targetActor.traits || [];

    ctx.attackPreparation = this.mapAttackPreparation(ctx);
    ctx = await this.combatProcessor.runPhase('prepare', ctx);

    ctx.attackCalculation = this.calculatePreparedAttack(ctx);
    ctx.attack!.status = ctx.attackCalculation.status;
    ctx.attack!.calculated = new ActionAttackCalculated(
      ctx.attackCalculation.calculated.rollModifiers,
      ctx.attackCalculation.calculated.rollTotal,
      undefined,
      ctx.attackCalculation.calculated.criticalAdjustment,
      ctx.attackCalculation.calculated.criticalModifiers,
      undefined,
      ctx.attackCalculation.calculated.fumble,
    );

    return ctx;
  }

  private getActorIds(action: Action, command: PrepareAttackCommand): string[] {
    const targetIds = command.attacks.map(a => a.modifiers.targetId);
    const protectors = command.attacks.flatMap(a => a.protectors || []);
    return Array.from(new Set([...targetIds, ...protectors, action.actorId]));
  }

  /**
   * Character sheets of the actors with one (NPCs have none), by actor id: the source's skills, and the
   * targets' defensive skills. The source's is always read.
   */
  private async readCharacters(actors: ActorRound[], sourceId: string): Promise<Map<string, Character>> {
    const characters = new Map<string, Character>();
    const ids = actors.filter(actor => actor.actorId === sourceId || actor.actorType !== 'npc').map(actor => actor.actorId);
    const found = await Promise.all(ids.map(id => this.characterClient.findById(id)));
    found.forEach((character, index) => character && characters.set(ids[index], character));
    return characters;
  }

  /** Combat skills of a sheet, with their ranks (0 for older sheets). */
  private mapSkills(character: Character | undefined): CombatAttackSourceSkill[] {
    return (
      character?.skills
        ?.filter(skill => this.isCombatSkill(skill.skillId))
        .map(skill => ({ skillId: skill.skillId, bonus: skill.totalBonus, ranks: skill.ranks ?? 0 })) || []
    );
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

    // From the ledger: a legacy free attack has its full AP and an attack forced by an effect takes no AP penalty.
    const actionPoints = action.actionPoints ?? 0;

    const situationalModifiers: CombatAttackSituationalModifiers = {
      cover: (attackModifiers.cover || 'none') as Cover,
      restrictedQuarters: (attackModifiers.restrictedQuarters || 'none') as RestrictedQuarters,
      positionalSource: attackModifiers.positionalSource || 'none',
      positionalTarget: (attackModifiers.positionalTarget || 'none') as PositionalTarget,
      disabledDB: attackModifiers.disabledDB || false,
      disabledShield: attackModifiers.disabledShield || false,
      disabledParry: attackModifiers.disabledParry || false,
      sizeDifference: sizeDifference(ctx),
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
        fumble: preparation.modifiers.fumble,
      },
      results: undefined,
      status: 'pending_attack_roll',
    };
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
    // A foe can be surprised and stunned at once (§9.5): both bonuses apply.
    const surprisedFoe = commandAttack.modifiers.surprisedFoe || false;
    const stunnedFoe = commandAttack.modifiers.stunnedFoe || false;
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
      commandAttack.protectorPositions,
    );
  }
}
