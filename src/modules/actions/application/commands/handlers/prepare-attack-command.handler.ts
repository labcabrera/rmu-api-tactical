/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as crr from '../../../../actor-rounds/application/ports/out/character-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/entities/actor-round.entity';
import * as gr from '../../../../games/application/ports/out/game.repository';
import { NotFoundError, UnprocessableEntityError, ValidationError } from '../../../../shared/domain/errors';
import * as cc from '../../../../strategic/application/ports/out/character-client';
import { Action, ActionAttack } from '../../../domain/entities/action.entity';
import * as aep from '../../ports/out/action-event-producer';
import * as ar from '../../ports/out/action.repository';
import * as ac from '../../ports/out/attack-client';
import { PrepareAttackCommand } from '../prepare-attack.command';

@CommandHandler(PrepareAttackCommand)
export class PrepareAttackCommandHandler implements ICommandHandler<PrepareAttackCommand, Action> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: crr.ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ar.ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: cc.CharacterClient,
    @Inject('AttackClient') private readonly attackClient: ac.AttackClient,
    @Inject('ActionEventProducer') private readonly actionEventProducer: aep.ActionEventProducer,
  ) {}

  async execute(command: PrepareAttackCommand): Promise<Action> {
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    if (action.actionType !== 'attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (action.status !== 'declared') {
      throw new ValidationError('Action is not in a preparable state');
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new UnprocessableEntityError('Game not found');
    }
    switch (game.phase) {
      case 'phase_1':
      case 'phase_2':
      case 'phase_3':
      case 'phase_4':
        break;
      default:
        throw new ValidationError('Game is not in a phase that allows action preparation');
    }
    const attack = action.attacks?.find((attack) => attack.attackName === command.attackName);
    if (!attack) {
      throw new ValidationError(`Attack type ${command.attackName} not found in action`);
    }

    const actorRoundSource = await this.actorRoundRepository.findByActorIdAndRound(action.actorId, action.round);
    if (!actorRoundSource) {
      throw new UnprocessableEntityError('Source actor round not found');
    }
    const actorRoundTarget = await this.actorRoundRepository.findByActorIdAndRound(attack.targetId, action.round);
    if (!actorRoundTarget) {
      throw new UnprocessableEntityError('Target actor round not found');
    }

    await this.createAttack(action, attack, actorRoundSource, actorRoundTarget, command);
    action.status = 'in_progress';
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventProducer.updated(updated);
    return updated;
  }

  private async createAttack(
    action: Action,
    attack: ActionAttack,
    actionRoundSource: ActorRound,
    actionRoundTarget: ActorRound,
    command: PrepareAttackCommand,
  ): Promise<void> {
    const actorSource = await this.characterClient.findById(action.actorId);
    if (!actorSource) {
      throw new UnprocessableEntityError('Missing source actor');
    }
    const actorTarget = await this.characterClient.findById(attack.targetId);
    if (!actorTarget) {
      throw new UnprocessableEntityError('Missing target actor');
    }
    const attackInfo = actorSource.attacks?.find((a) => a.attackName === command.attackName);
    if (!attackInfo) {
      throw new UnprocessableEntityError('Missing attack info');
    }

    //TODO MAP
    const offHand = false;
    const twoHandedWeapon = false;
    const attackFeatures = [];
    const injuryPenalty = 0;
    const fatiguePenalty = 0;
    const rangePenalty = 0;
    const shield = 0;
    const parry = 0;

    const request = {
      actionId: action.id,
      sourceId: action.actorId,
      targetId: attack.targetId,
      modifiers: {
        attackType: 'melee',
        attackTable: attackInfo.attackTable,
        attackSize: this.getAttackSize(attackInfo.sizeAdjustment),
        fumbleTable: attackInfo.fumbleTable,
        at: actorTarget.defense.armorType,
        actionPoints: action.actionPoints,
        fumble: attackInfo.fumble,
        rollModifiers: {
          bo: attackInfo.bo,
          bd: actorTarget.defense.defensiveBonus,
          injuryPenalty: injuryPenalty,
          fatiguePenalty: fatiguePenalty,
          rangePenalty: rangePenalty,
          shield: shield,
          parry: parry,
          customBonus: command.customBonus,
        },
        situationalModifiers: {
          cover: command.cover,
          restrictedQuarters: command.restrictedQuarters,
          positionalSource: command.positionalSource,
          positionalTarget: command.positionalTarget,
          dodge: command.dodge,
          disabledDB: command.disabledDB,
          disabledShield: command.disabledShield,
          disabledParry: command.disabledParry,
          sizeDifference: this.calculateSizeDifference(actorSource.info.sizeId, actorTarget.info.sizeId),
          offHand: offHand,
          twoHandedWeapon: twoHandedWeapon,
          sourceStatus: this.mapActorRoundEffects(actionRoundSource),
          targetStatus: this.mapActorRoundEffects(actionRoundTarget),
        },
        features: attackFeatures,
      },
    };
    const response = await this.attackClient.prepareAttack(request);
    attack.attackId = response.id;
    attack.status = 'in_progress';
  }

  private getAttackSize(size: number): string {
    switch (size) {
      case -1:
        return 'Small';
      case 0:
        return 'Medium';
      case 1:
        return 'Large';
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
}
