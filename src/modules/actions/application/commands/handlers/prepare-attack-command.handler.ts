import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as crr from '../../../../character-rounds/application/ports/out/character-round.repository';
import * as cr from '../../../../characters/application/ports/out/character.repository';
import * as gr from '../../../../games/application/ports/out/game.repository';
import { ValidationError } from '../../../../shared/domain/errors';
import { Action, ActionAttack } from '../../../domain/entities/action.entity';
import * as aep from '../../ports/out/action-event-producer';
import * as ar from '../../ports/out/action.repository';
import * as ac from '../../ports/out/attack-client';
import { PrepareAttackCommand } from '../prepare-attack.command';

@CommandHandler(PrepareAttackCommand)
export class PrepareAttackCommandHandler implements ICommandHandler<PrepareAttackCommand, Action> {
  constructor(
    @Inject('GameRepository') private readonly gameRepository: gr.GameRepository,
    @Inject('CharacterRepository') private readonly characterRepository: cr.CharacterRepository,
    @Inject('CharacterRoundRepository') private readonly characterRoundRepository: crr.CharacterRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ar.ActionRepository,
    @Inject('AttackClient') private readonly attackClient: ac.AttackClient,
    @Inject('ActionEventProducer') private readonly actionEventProducer: aep.ActionEventProducer,
  ) {}

  async execute(command: PrepareAttackCommand): Promise<Action> {
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new ValidationError('Action not found');
    }
    if (action.actionType !== 'attack') {
      throw new ValidationError('Action is not an attack');
    }
    if (action.status !== 'declared') {
      throw new ValidationError('Action is not in a preparable state');
    }
    const attack = action.attacks?.find((attack) => attack.attackType === command.attackType);
    if (!attack) {
      throw new ValidationError(`Attack type ${command.attackType} not found in action`);
    }
    await this.createAttack(action, attack, command);
    action.status = 'in_progress';
    action.updatedAt = new Date();
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventProducer.updated(updated);
    return updated;
  }

  private async createAttack(action: Action, attack: ActionAttack, command: PrepareAttackCommand): Promise<void> {
    const source = await this.characterRepository.findById(action.characterId);
    if (!source) {
      throw new ValidationError('Character not found');
    }
    const target = await this.characterRepository.findById(attack.targetId);
    if (!target) {
      throw new ValidationError('Target character not found');
    }

    const attackInfo = {
      attackTable: 'attack_table',
      attackSize: 'medium',
      fumbleTable: 'fumble_table',
      fumble: 3,
      at: 10,
      bo: 50,
    };

    const sizeDifference = 0;
    const offHand = false;
    const twoHandedWeapon = false;
    const sourceStatus = [] as string[];
    const targetStatus = [] as string[];
    const attackFeatures = [];

    const request = {
      actionId: action.id,
      sourceId: action.characterId,
      targetId: attack.targetId,
      modifiers: {
        attackType: attack.attackType,
        attackTable: attackInfo.attackTable,
        attackSize: attackInfo.attackSize,
        fumbleTable: attackInfo.fumbleTable,
        at: target.defense.armorType,
        actionPoints: action.actionPoints,
        fumble: attackInfo.fumble,
        rollModifiers: {
          bo: attackInfo.bo,
          bd: target.defense.defensiveBonus,
          injuryPenalty: 0,
          fatiguePenalty: 0,
          rangePenalty: 0,
          shield: 0,
          parry: 0,
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
          sizeDifference: sizeDifference,
          offHand: offHand,
          twoHandedWeapon: twoHandedWeapon,
          sourceStatus: sourceStatus,
          targetStatus: targetStatus,
        },
        features: attackFeatures,
      },
    };
    const response = await this.attackClient.prepareAttack(request);
    attack.attackId = response.id;
    attack.status = 'in_progress';
  }
}
