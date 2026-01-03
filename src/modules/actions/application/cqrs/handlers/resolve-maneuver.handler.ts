import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import type { ActorRoundRepository } from '../../../../actor-rounds/application/ports/out/actor-round.repository';
import { ActorRound } from '../../../../actor-rounds/domain/aggregates/actor-round.aggregate';
import type { GameRepository } from '../../../../games/application/ports/game.repository';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors';
import type { Character, CharacterPort } from '../../../../strategic/application/ports/character.port';
import type { StrategicGamePort } from '../../../../strategic/application/ports/strategic-game.port';
import { Action } from '../../../domain/aggregates/action.aggregate';
import { ActionUpdatedEvent } from '../../../domain/events/action-events';
import type { ActionEventBusPort } from '../../ports/action-event-bus.port';
import type { ActionRepository } from '../../ports/action.repository';
import type { ManeuverPort } from '../../ports/maneuver.port';
import { AbsoluteManeuverProcessorService } from '../../services/absolute-maneuver-processor.service';
import { ResolveManeuverCommand } from '../commands/resolve-maneuver.commands';

@CommandHandler(ResolveManeuverCommand)
export class ResolveManeuverHandler implements ICommandHandler<ResolveManeuverCommand, Action> {
  private readonly logger = new Logger(ResolveManeuverHandler.name);

  constructor(
    @Inject('GameRepository') private readonly gameRepository: GameRepository,
    @Inject('ActorRoundRepository') private readonly actorRoundRepository: ActorRoundRepository,
    @Inject('ActionRepository') private readonly actionRepository: ActionRepository,
    @Inject('CharacterClient') private readonly characterClient: CharacterPort,
    @Inject('StrategicGameClient') private readonly strategicGameClient: StrategicGamePort,
    @Inject('ActionEventBus') private readonly actionEventBus: ActionEventBusPort,
    @Inject('ManeuverPort') private readonly maneuverPort: ManeuverPort,
    private readonly absoluteManeuverProcessorService: AbsoluteManeuverProcessorService,
  ) {}

  async execute(command: ResolveManeuverCommand): Promise<Action> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);
    const action = await this.actionRepository.findById(command.actionId);
    if (!action) {
      throw new NotFoundError('Action', command.actionId);
    }
    const game = await this.gameRepository.findById(action.gameId);
    if (!game) {
      throw new NotFoundError('Game', action.gameId);
    }
    this.validate(command, action);
    const [actorRound, character, strategicGame] = await Promise.all([
      this.actorRoundRepository.findByActorIdAndRound(action.actorId, action.round),
      this.characterClient.findById(action.actorId),
      this.strategicGameClient.findById(game.strategicGameId),
    ]);
    if (!actorRound) throw new NotFoundError('ActorRound', `${action.actorId} - ${action.round}`);
    if (!character) throw new NotFoundError('Character', action.actorId);
    if (!strategicGame) throw new NotFoundError('StrategicGame', game.strategicGameId);

    const currentPhase = game.phase.replace('phase_', '') as unknown as number;

    await this.processAction(command, action, character, actorRound, currentPhase);
    const updated = await this.actionRepository.update(action.id, action);
    await this.actionEventBus.publish(new ActionUpdatedEvent(updated));
    return updated;
  }

  private validate(command: ResolveManeuverCommand, action: Action): void {
    if (action.actionType !== 'maneuver') {
      throw new ValidationError('Action is not a maneuver action');
    } else if (action.status === 'completed') {
      throw new ValidationError('Action is already completed');
    } else if (!command.roll || !command.roll.roll) {
      throw new ValidationError('Required roll value');
    }
  }

  private async processAction(
    command: ResolveManeuverCommand,
    action: Action,
    character: Character,
    actorRound: ActorRound,
    currentPhase: number,
  ): Promise<void> {
    action.phaseEnd = currentPhase;
    action.actionPoints = action.freeAction ? 0 : action.phaseEnd - action.phaseStart + 1;
    this.mergeModifiers(action, command);
    this.absoluteManeuverProcessorService.applyModifiers(action, character, actorRound, command.roll.roll);
    const result = await this.maneuverPort.absolute(action.maneuver!.roll!.totalRoll!);
    action.maneuver!.result = {
      result: result.result,
      message: result.message,
    };
    action.status = 'completed';
    action.updatedAt = new Date();
  }

  private mergeModifiers(action: Action, command: ResolveManeuverCommand): void {
    action.maneuver!.modifiers = { ...action.maneuver!.modifiers, ...command.modifiers };
  }
}
