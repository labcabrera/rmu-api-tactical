import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/actor-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, UnprocessableEntityError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import { StrategicGameApiClient } from '../../../../strategic/infrastructure/api-clients/api-strategic-game.adapter';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionAttackCalculated } from '../../../domain/value-objects/action-attack-calculated.vo';
import { ActionAttackModifiers } from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ActionAttack } from '../../../domain/value-objects/action-attack.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type {
  AttackCreationRequest,
  AttackPort,
  AttackRollModifiers,
  AttackSituationalModifiers,
  AttackSourceSkill,
} from '../../ports/attack.port';
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
    @Inject('AttackPort') private readonly attackClient: AttackPort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
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
    const actionAttacks = command.attacks.map((attack) => this.mapAttacks(attack, action));
    action.setActionPoints(game.getActionPhase());
    const actorRoundIds = Array.from(new Set(actionAttacks.map((a) => a.modifiers.targetId!).concat([action.actorId])));

    const actors = await this.actorRoundRepository.findByGameAndRoundAndActors(game.id, game.round, actorRoundIds);
    if (actorRoundIds.length !== actors.length) {
      throw new UnprocessableEntityError('Missing actors in the current round');
    }

    const skills = await this.getSourceSkills(action.actorId, actors);

    const gameLethality = strategicGame.options?.lethality || 0;
    const attackNumber = command.attacks.length;
    const targets: Set<string> = new Set();
    command.attacks.forEach((a) => targets.add(a.modifiers.targetId));
    const targetsNumber = targets.size;

    await Promise.all(
      actionAttacks.map((attack) =>
        this.processAttackPort(attack, action, actors, skills, attackNumber, targetsNumber, gameLethality),
      ),
    );
    action.attacks = actionAttacks;
    //TODO read actions
    const targetActions = await this.actionRepository
      .findByRsql(
        `gameId==${action.gameId};round==${game.round};actorId=in=(${Array.from(targets).join(',')})`,
        0,
        1000,
      )
      .then((res) => res.content);

    const targetActors = actors.filter((a) => a.actorId !== action.actorId);
    action.processParryOptions(targetActors, targetActions);

    //TODO check effects and intermediate actions
    action.actionPoints = game.getActionPhase() - action.phaseStart + 1;
    action.status = action.parries?.length && action.parries.length > 0 ? 'parry' : 'prepared';

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private async processAttackPort(
    attack: ActionAttack,
    action: Action,
    actors: ActorRound[],
    skills: AttackSourceSkill[],
    attackNumber: number,
    targetsNumber: number,
    gameLethality: number,
  ): Promise<void> {
    const request = this.mapAttackToPortModel(
      attack,
      action,
      actors,
      skills,
      attackNumber,
      targetsNumber,
      gameLethality,
    );

    const portResponse = await this.attackClient.prepareAttack(request);
    attack.externalAttackId = portResponse.id;
    attack.status = portResponse.status;

    let requiredLocationRoll = false;
    if (!ActionAttack.isCalledShot(attack)) {
      const target = actors.find((a) => a.actorId === attack.modifiers.targetId)!;
      if (!target.defense.at) {
        requiredLocationRoll = true;
      }
    }

    attack.calculated = new ActionAttackCalculated(
      portResponse.calculated.rollModifiers,
      portResponse.calculated.rollTotal,
      undefined,
      requiredLocationRoll,
    );
  }

  private mapAttackToPortModel(
    attack: ActionAttack,
    action: Action,
    actors: ActorRound[],
    skills: AttackSourceSkill[],
    attackNumber: number,
    targetsNumber: number,
    gameLethality: number,
  ): AttackCreationRequest {
    const attackModifiers = attack.modifiers;
    const actorRoundSource = actors.find((a) => a.actorId === action.actorId)!;
    const actorRoundTarget = actors.find((a) => a.actorId === attackModifiers.targetId)!;

    const isMeleeAttack = attack.type === 'melee';

    const attackInfo = actorRoundSource?.attacks?.find((a) => a.attackName === attack.attackName);
    if (!attackInfo) throw new UnprocessableEntityError('Attack not found on actor');

    //TODO MAP
    const actionPoints = action.freeAction ? (isMeleeAttack ? 4 : 3) : action.actionPoints!;
    const offHand = attack.attackName.toLowerCase().includes('off-hand');
    let rangePenalty = 0;
    const twoHandedWeapon = false;
    const attackFeatures = [];
    const injuryPenalty = 0;
    const fatiguePenalty = 0;

    const shield = this.getShieldBonus(actorRoundTarget, attackModifiers.disabledShield || false);
    // Declared later
    const parry = 0;

    if (!isMeleeAttack && attackModifiers.range !== undefined) {
      const rangedAttack = actorRoundSource.attacks?.find((a) => a.attackName === attack.attackName);
      if (!rangedAttack) {
        throw new UnprocessableEntityError(`Attack ${attack.attackName} not found on actor`);
      }
      rangePenalty = rangedAttack.calculateRangeBonus(attackModifiers.range);
    }

    const attackSize = 2;
    const defenderSize = 2;
    const sizeDifference = attackSize - defenderSize;

    const rollModifiers = {
      bo: attackModifiers.bo,
      bd: actorRoundTarget.defense.bd,
      calledShot: attackModifiers.calledShot,
      calledShotPenalty: attackModifiers.calledShotPenalty,
      injuryPenalty: injuryPenalty,
      fatiguePenalty: fatiguePenalty,
      rangePenalty: rangePenalty,
      shield: shield,
      parry: parry,
      attackNumber: attackNumber,
      attackTargets: targetsNumber,
      gameLethality: gameLethality,
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
      sizeDifference: sizeDifference,
      offHand: offHand,
      twoHandedWeapon: twoHandedWeapon,
      higherGround: attackModifiers.higherGround || false,
      sourceStatus: this.mapActorSourceRoundEffects(actorRoundSource, attack),
      targetStatus: this.mapActorTargetRoundEffects(actorRoundTarget, attack),
    } as AttackSituationalModifiers;

    const request = {
      gameId: action.gameId,
      actionId: action.id,
      sourceId: action.actorId,
      targetId: attackModifiers.targetId!,
      modifiers: {
        attackType: attack.type,
        attackTable: attackInfo.attackTable,
        attackSize: attackInfo.attackSize, // numeric size
        fumbleTable: attackInfo.fumbleTable,
        fumble: attackInfo.fumble,
        actionPoints: actionPoints,
        calledShot: attackModifiers.calledShot,
        armor: {
          at: actorRoundTarget.defense.at,
          headAt: actorRoundTarget.defense.headAt,
          bodyAt: actorRoundTarget.defense.bodyAt,
          armsAt: actorRoundTarget.defense.armsAt,
          legsAt: actorRoundTarget.defense.legsAt,
        },
        rollModifiers: rollModifiers,
        situationalModifiers: situationalModifiers,
        features: attackFeatures,
        sourceSkills: skills,
      },
    };
    return request;
  }

  private async getSourceSkills(sourceActorId: string, actors: ActorRound[]): Promise<AttackSourceSkill[]> {
    const actor = actors.find((a) => a.actorId === sourceActorId);
    //TODO NPCs
    const character = await this.characterClient.findById(actor?.actorId || '');
    return (
      character?.skills
        .filter((skill) => this.isCombatSkill(skill.skillId))
        .map((skill) => ({ skillId: skill.skillId, bonus: skill.totalBonus })) || []
    );
  }

  private isCombatSkill(skillId: string): boolean {
    const combatSkills = ['multiple-attacks', 'reverse-strike', 'footwork', 'restricted-quarters', 'called-shot'];
    return combatSkills.includes(skillId);
  }

  private getShieldBonus(targetActor: ActorRound, disabledShield: boolean): number {
    if (disabledShield) return 0;
    if (!targetActor.defense.shield) return 0;
    //TODO update model with current blocks;
    return targetActor.defense.shield.shieldDb;
  }

  private getAttackSize(size: number): number {
    switch (size) {
      case -1:
        return -1;
      case 0:
        return 0;
      case 1:
        return 1;
      default:
        throw new UnprocessableEntityError('Invalid size value');
    }
  }

  private mapActorSourceRoundEffects(actorRound: ActorRound, attack: ActionAttack): string[] {
    const effects = actorRound.effects?.map((effect) => effect.status) || [];
    if (attack.modifiers.proneSource) effects.push('prone');
    if (attack.modifiers.attackerInMelee) effects.push('melee');
    return effects;
  }

  private mapActorTargetRoundEffects(actorRound: ActorRound, attack: ActionAttack): string[] {
    const effects = actorRound.effects?.map((effect) => effect.status) || [];
    if (attack.modifiers.proneTarget) effects.push('prone');
    if (attack.modifiers.surprisedFoe) effects.push('surprised');
    if (attack.modifiers.stunnedFoe) effects.push('stunned');
    return effects;
  }

  private mapAttacks(commandAttack: PrepareAttackCommandItem, action: Action): ActionAttack {
    const currentAttack = action.attacks!.find((a) => a.attackName === commandAttack.attackName);
    if (!currentAttack) {
      throw new UnprocessableEntityError(`Attack ${commandAttack.attackName} not found on action`);
    }
    // Parry is delared later
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
      currentAttack.attackName,
      currentAttack.type,
      modifiers,
      undefined,
      undefined,
      undefined,
      undefined,
      'pending_attack_roll',
    );
  }
}
