import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type ManeuverPort, MANEUVER_PORT } from '../../../../actions/application/ports/maneuver.port.js';
import { NotFoundError, ValidationError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { ActorSheetService } from '../../services/actor-sheet.service.js';
import { ResolveEnduranceCheckCommand } from '../commands/resolve-endurance-check.command.js';

/**
 * Endurance roll (§5.5, Table 5-5, M6): the result's fatigue goes into the actor's fatigue penalty, which every
 * action then takes as the `fatigue` penalty source, and its hits are taken. Fatigue beyond -50 is an injury (spec 013). The +5 of an absolute success to the
 * next action is not modelled: it is in the result message for the game master.
 *
 * Workspace spec 077, decision B1.6: the load penalty of the sheet (`equipment.encumbrancePenalty`) is added as the
 * automatic `encumbrance` modifier, as in the maneuvers; an `encumbrance` modifier sent by the client is left out.
 */
/** Key of the automatic load modifier of the endurance roll (workspace spec 077, decision B1.6), as in the maneuvers. */
export const ENCUMBRANCE_KEY = 'encumbrance';

@CommandHandler(ResolveEnduranceCheckCommand)
export class ResolveEnduranceCheckHandler implements ICommandHandler<ResolveEnduranceCheckCommand, ActorRound> {
  private readonly logger = new Logger(ResolveEnduranceCheckHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(MANEUVER_PORT) private readonly maneuverPort: ManeuverPort,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly sheets: ActorSheetService,
  ) {}

  async execute(command: ResolveEnduranceCheckCommand): Promise<ActorRound> {
    this.logger.log(`Execute << ${JSON.stringify(command)}`);

    const actorRound = await this.actorRoundRepository.findById(command.roundActorId);
    if (!actorRound) throw new NotFoundError('ActorRound', command.roundActorId);
    const game = await this.gameRepository.findById(actorRound.gameId);
    game?.checkNotFinished();

    if (command.alertId && !actorRound.alerts.some(a => a.id === command.alertId)) {
      throw new ValidationError(`Alert ${command.alertId} not found in the actor round`);
    }
    if (typeof command.roll !== 'number' || !Number.isFinite(command.roll)) {
      throw new ValidationError('Required roll value');
    }

    const sent = (command.modifiers || []).filter(mod => mod.key !== ENCUMBRANCE_KEY);
    const encumbrance = await this.encumbrancePenalty(actorRound);
    const modifiers = sent.reduce((acc, mod) => acc + (mod.value || 0), 0) + encumbrance;
    const result = await this.maneuverPort.endurance(command.roll + modifiers);
    this.logger.debug(`Endurance check result: ${JSON.stringify(result)}`);

    const phase = game && game.round === actorRound.round ? game.getEffectPhase() : undefined;
    actorRound.applyEnduranceResult(result.fatigue || 0, result.hitPoints || 0, command.alertId, game?.name, phase);
    return this.actorRoundRepository.update(actorRound);
  }

  /** The load penalty of the actor's sheet (0 or negative); an NPC or a sheet that cannot be read has none. */
  private async encumbrancePenalty(actorRound: ActorRound): Promise<number> {
    const sheet = await this.sheets.find(actorRound);
    return Math.min(0, sheet?.equipment?.encumbrancePenalty ?? 0);
  }
}
