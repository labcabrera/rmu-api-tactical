import { Inject, Logger } from '@nestjs/common';
import { CommandBus, CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { DeleteEffectCommand } from '../../../../actor-rounds/application/cqrs/commands/delete-effect.command';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/actor-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { CharacterPort } from '../../../../strategic/application/ports/character.port';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import { ActionApProfile } from '../../../domain/value-objects/action-ap-profile.vo';
import { SIMPLE_ACTION_TYPES } from '../../../domain/value-objects/action-type.vo';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import { CompleteActionCommand } from '../commands/complete-action.command';

/** Full dodge or block: the whole round (§9.6). */
const FULL_DEFENSE_ACTION_POINTS = ActionApProfile.forAction('dodge').max;

/** Action phases of a round. */
const ACTION_PHASES = 4;

/**
 * Completes an action that has no rolls (stand up, dodge, draw and load, other) in the current phase, with the AP of
 * the ledger (spec 011): it needs the minimum AP of its profile unless it is forced. Standing up checks its cost and
 * clears the actor's prone effects. A dodge is the 4 AP full dodge or full block of the round (§9.6): completing it
 * takes the AP of the phases left in the round, and sets the actor's defence mode.
 */
@CommandHandler(CompleteActionCommand)
export class CompleteActionHandler implements ICommandHandler<CompleteActionCommand, Action> {
  private readonly logger = new Logger(CompleteActionHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    private readonly commandBus: CommandBus,
  ) {}

  async execute(command: CompleteActionCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) throw new NotFoundError('Action', command.actionId);
    if (!SIMPLE_ACTION_TYPES.includes(action.actionType)) {
      throw new ValidationError(`Action type ${action.actionType} cannot be completed without resolution`);
    }
    if (action.status === 'completed') throw new ValidationError('Action is already completed');
    if (action.actionType !== 'dodge' && command.defenseType) {
      throw new ValidationError('A defence type is only declared for dodge actions');
    }

    const game = await this.gameRepository.findById(action.gameId);
    if (!game) throw new NotFoundError('Game', action.gameId);
    const currentPhase = game.getActionPhase();
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(action.gameId, action.actorId, action.round);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    const ledgerSize = actorRound.apLedger.length;

    if (action.actionType === 'dodge') {
      this.takeFullDefenseAp(action, actorRound, currentPhase);
      actorRound.setFullDefense(command.defenseType ?? 'dodge');
    } else if (action.actionType === 'stand_up') {
      await this.checkStandUpCost(action, actorRound, currentPhase);
    }
    action.checkResolvable(actorRound, currentPhase);

    if (command.note !== undefined) action.description = command.note;
    action.close(actorRound, currentPhase);

    if (action.actionType === 'dodge' || actorRound.apLedger.length !== ledgerSize) {
      await this.actorRoundRepository.update(actorRound.id, actorRound);
    }
    if (action.actionType === 'stand_up') {
      await this.clearProne(actorRound, command);
    }
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    updated.refreshApState(actorRound, currentPhase);
    return updated;
  }

  /** Standing up (Table 8-1, §9.8 Prone): 2 AP, or 1 with Acrobatics ranks. */
  private async checkStandUpCost(action: Action, actorRound: ActorRound, currentPhase: number): Promise<void> {
    const character = await this.characterClient.findById(action.actorId);
    const acrobatics = character?.skills?.find(skill => skill.skillId === 'acrobatics')?.ranks || 0;
    const profile = ActionApProfile.forAction('stand_up', { acrobatics: acrobatics > 0 });
    action.apRange = { min: profile.min, max: profile.max };
    if (!action.isForced() && action.apOf(actorRound, currentPhase) < profile.min) {
      throw new ValidationError(`Standing up takes ${profile.min} action points`, 'err-stand-up-action-points');
    }
  }

  /**
   * A full dodge or block takes 4 AP: the action keeps the AP it spent and takes the free AP of the current phase and
   * of the next ones until it has them all (`err-full-defense-action-points` when the round has not enough left).
   */
  private takeFullDefenseAp(action: Action, actorRound: ActorRound, currentPhase: number): void {
    const error = () =>
      new ValidationError('A full dodge or block takes the 4 action points of the round', 'err-full-defense-action-points');
    if (action.freeAction) {
      throw error();
    }
    action.fillLegacyLedger(actorRound, currentPhase);
    const spent = action.apOf(actorRound, currentPhase);
    const needed = FULL_DEFENSE_ACTION_POINTS - spent;
    const plan: Array<[number, number]> = [];
    let left = needed;
    for (let phase = currentPhase; phase <= ACTION_PHASES && left > 0; phase++) {
      const taken = Math.min(actorRound.freeCapacity(phase), left);
      if (taken > 0) {
        plan.push([phase, taken]);
        left -= taken;
      }
    }
    if (left > 0) {
      throw error();
    }
    plan.forEach(([phase, ap]) => actorRound.spend(phase, action.id, ap));
  }

  private async clearProne(actorRound: ActorRound, command: CompleteActionCommand): Promise<void> {
    const prone = actorRound.effects.filter(effect => effect.status === 'prone');
    for (const effect of prone) {
      await this.commandBus.execute(new DeleteEffectCommand(actorRound.id, effect.id, command.userId, command.roles));
    }
  }
}
