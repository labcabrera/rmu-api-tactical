import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, UnprocessableEntityError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import { StrategicGameApiClient } from '../../../../strategic/infrastructure/api-clients/api-strategic-game.adapter';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionAttackModifiers } from '../../../domain/value-objects/action-attack-modifiers.vo';
import { ActionAttack, ActionAttackCalculated } from '../../../domain/value-objects/action-attack.vo';
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
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new UnprocessableEntityError('Game not found');
    }
    const strategicGame = await this.strategicGameClient.findById(game.strategicGameId);
    if (!strategicGame) {
      throw new NotFoundError('StrategicGame', game.strategicGameId);
    }
    const gameLethality = strategicGame.options?.lethality || 0;

    game.checkValidActionManagement();
    const actionAttacks = command.attacks.map((attack) => this.mapAttacks(attack));
    //TODO check intermediate action
    const actionPoints = game.getActionPhase() - action.phaseStart + 1;
    const actorRoundIds = Array.from(new Set(actionAttacks.map((a) => a.modifiers.targetId).concat([action.actorId])));
    const rsql = `gameId==${action.gameId};round==${game.round};actorId=in=(${actorRoundIds.join(',')})`;
    const actors = (await this.actorRoundRepository.findByRsql(rsql, 0, 1000)).content;
    if (actorRoundIds.length !== actors.length) {
      throw new UnprocessableEntityError('Some actors not found in the current round');
    }

    const skills = await this.getSourceSkills(action.actorId, actors);

    const attackNumber = command.attacks.length;
    const targets: Set<string> = new Set();
    command.attacks.forEach((a) => targets.add(a.targetId));
    const targetsNumber = targets.size;

    await Promise.all(
      actionAttacks.map((attack) =>
        this.processAttackPort(attack, actionPoints, action, actors, skills, attackNumber, targetsNumber, gameLethality),
      ),
    );
    action.attacks = actionAttacks;
    action.processParryOptions(actors);

    //TODO check effects and intermediate actions
    action.actionPoints = game.getActionPhase() - action.phaseStart + 1;

    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private async processAttackPort(
    attack: ActionAttack,
    actionPoints: number,
    action: Action,
    actors: ActorRound[],
    skills: AttackSourceSkill[],
    attackNumber: number,
    targetsNumber: number,
    gameLethality: number,
  ): Promise<void> {
    const request = this.mapAttack(attack, actionPoints, action, actors, skills, attackNumber, targetsNumber, gameLethality);
    const portResponse = await this.attackClient.prepareAttack(request);
    attack.externalAttackId = portResponse.id;
    attack.calculated = new ActionAttackCalculated(portResponse.calculated.rollModifiers, portResponse.calculated.rollTotal);
  }

  private mapAttack(
    attack: ActionAttack,
    actionPoints: number,
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
    const attackInfo = actorRoundSource?.attacks?.find((a) => a.attackName === attackModifiers.attackName);
    if (!attackInfo) {
      throw new UnprocessableEntityError('Attack not found on actor');
    }
    //TODO MAP
    const offHand = attackModifiers.attackName.toLowerCase().includes('off-hand');
    const twoHandedWeapon = false;
    const attackFeatures = [];
    const injuryPenalty = 0;
    const fatiguePenalty = 0;
    const rangePenalty = 0;
    const shield = 0;

    const rollModifiers = {
      bo: attackModifiers.bo,
      bd: actorRoundTarget.defense.bd,
      calledShot: attackModifiers.calledShot,
      calledShotPenalty: attackModifiers.calledShotPenalty,
      injuryPenalty: injuryPenalty,
      fatiguePenalty: fatiguePenalty,
      rangePenalty: rangePenalty,
      shield: shield,
      parry: 0, // declared later
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
      sizeDifference: 0, //TODO this.calculateSizeDifference(actorSource.info.sizeId, actorTarget.info.sizeId),
      offHand: offHand,
      twoHandedWeapon: twoHandedWeapon,
      sourceStatus: this.mapActorRoundEffects(actorRoundSource),
      targetStatus: this.mapActorRoundEffects(actorRoundTarget),
    } as AttackSituationalModifiers;

    const request = {
      gameId: action.gameId,
      actionId: action.id,
      sourceId: action.actorId,
      targetId: attackModifiers.targetId,
      modifiers: {
        attackType: 'melee',
        attackTable: attackInfo.attackTable,
        attackSize: 'medium', //this.getAttackSize(attack.sizeAdjustment),
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

  private getAttackSize(size: number): string {
    switch (size) {
      case -1:
        return 'small';
      case 0:
        return 'medium';
      case 1:
        return 'big';
      default:
        throw new UnprocessableEntityError('Invalid size value');
    }
  }

  private calculateSizeDifference(sourceSize: string, targetSize: string): number {
    //TODO load table map
    const sizeMap = { medium: 0, small: -1, large: 1 };
    const sourceValue = sizeMap[sourceSize];
    const targetValue = sizeMap[targetSize];
    return (sourceValue || 0) - (targetValue || 0);
  }

  private mapActorRoundEffects(actorRound: ActorRound): string[] {
    return actorRound.effects?.map((effect) => effect.status) || [];
  }

  private mapAttacks(commandAttack: PrepareAttackCommandItem): ActionAttack {
    const modifiers = new ActionAttackModifiers(
      commandAttack.attackName,
      //TODO read from attack info
      'melee',
      commandAttack.targetId,
      commandAttack.bo,
      0, // parry is declared later
      commandAttack.calledShot || 'none',
      commandAttack.calledShotPenalty || 0,
      commandAttack.cover,
      commandAttack.restrictedQuarters,
      commandAttack.positionalSource,
      commandAttack.positionalTarget,
      commandAttack.dodge,
      commandAttack.range,
      commandAttack.disabledDB,
      commandAttack.disabledShield,
      commandAttack.disabledParry,
      commandAttack.customBonus,
    );
    return new ActionAttack(modifiers, undefined, undefined, undefined, undefined, 'declared');
  }
}
