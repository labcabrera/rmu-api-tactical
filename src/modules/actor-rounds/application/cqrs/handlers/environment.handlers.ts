import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../../../games/application/ports/game-repository.port.js';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { breathLimitRounds } from '../../../domain/services/environment-rules.js';
import type { ActorRoundBreath } from '../../../domain/value-objects/actor-round-breath.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { ActorSheetService } from '../../services/actor-sheet.service.js';
import { SetEnvironmentProtectionCommand, StartBreathCommand, StopBreathCommand } from '../commands/environment.commands.js';

/** Constitution stat of the sheet. */
const CONSTITUTION = 'co';

/** Loads the actor round of a game that is not finished. */
async function loadOpen(actorRounds: ActorRoundRepository, games: GameRepository, id: string): Promise<ActorRound> {
  const actorRound = await actorRounds.findById(id);
  if (!actorRound) throw new NotFoundError('Actor round', id);
  (await games.findById(actorRound.gameId))?.checkNotFinished();
  return actorRound;
}

/**
 * Workspace spec 079, C4 (§15.2): the actor starts holding its breath. Its limit is fixed now, with the Constitution
 * bonus of the character sheet (the one sent for an NPC, or 0): 12 + bonus prepared, the bonus alone unprepared, at
 * least 1. Breath Holding (phase 7) will replace the base.
 */
@CommandHandler(StartBreathCommand)
export class StartBreathHandler implements ICommandHandler<StartBreathCommand, ActorRound> {
  private readonly logger = new Logger(StartBreathHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
    private readonly sheets: ActorSheetService,
  ) {}

  async execute(command: StartBreathCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await loadOpen(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    let constitutionBonus = 0;
    let constitutionSource: ActorRoundBreath['constitutionSource'] = 'none';
    if (command.constitutionBonus !== undefined) {
      constitutionBonus = command.constitutionBonus;
      constitutionSource = 'request';
    } else {
      const sheetBonus = (await this.sheets.find(actorRound))?.statistics?.[CONSTITUTION]?.totalBonus;
      if (typeof sheetBonus === 'number') {
        constitutionBonus = sheetBonus;
        constitutionSource = 'sheet';
      }
    }
    actorRound.startBreath({
      prepared: command.prepared,
      underwater: command.underwater,
      constitutionBonus,
      constitutionSource,
      limitRounds: breathLimitRounds({ prepared: command.prepared, constitutionBonus }),
      note: command.note,
    });
    return this.actorRoundRepository.update(actorRound);
  }
}

/** Workspace spec 079, C4: the actor breathes again; its suffocation ends. */
@CommandHandler(StopBreathCommand)
export class StopBreathHandler implements ICommandHandler<StopBreathCommand, ActorRound> {
  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: StopBreathCommand): Promise<ActorRound> {
    const actorRound = await loadOpen(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.stopBreath();
    return this.actorRoundRepository.update(actorRound);
  }
}

/** Workspace spec 079, C3: the game master marks the actor protected from the extreme temperature, or not. */
@CommandHandler(SetEnvironmentProtectionCommand)
export class SetEnvironmentProtectionHandler implements ICommandHandler<SetEnvironmentProtectionCommand, ActorRound> {
  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository,
  ) {}

  async execute(command: SetEnvironmentProtectionCommand): Promise<ActorRound> {
    const actorRound = await loadOpen(this.actorRoundRepository, this.gameRepository, command.actorRoundId);
    actorRound.setEnvironmentProtection(command.value);
    return this.actorRoundRepository.update(actorRound);
  }
}
