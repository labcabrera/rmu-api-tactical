import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { NotFoundError } from '../../../../shared/domain/errors/errors.js';
import { ActorRound } from '../../../domain/aggregates/actor-round.js';
import { DEFAULT_HEALING_COMBAT_RULES } from '../../../domain/value-objects/treatment-difficulty.vo.js';
import { type ActorRoundRepository, ACTOR_ROUND_REPOSITORY } from '../../ports/actor-round-repository.port.js';
import { type HealingTablesPort, HEALING_TABLES_PORT } from '../../ports/healing-tables.port.js';
import { UpkeepActorRoundCommand } from '../commands/upkeep-actor-round.command.js';

@CommandHandler(UpkeepActorRoundCommand)
export class UpkeepActorRoundHandler implements ICommandHandler<UpkeepActorRoundCommand, ActorRound> {
  private readonly logger = new Logger(UpkeepActorRoundHandler.name);

  constructor(
    @Inject(ACTOR_ROUND_REPOSITORY) private readonly actorRoundRepository: ActorRoundRepository,
    @Inject(HEALING_TABLES_PORT) private readonly healingTables: HealingTablesPort,
  ) {}

  async execute(command: UpkeepActorRoundCommand): Promise<ActorRound> {
    this.logger.debug(`Execute << ${JSON.stringify(command)}`);
    const actorRound = await this.actorRoundRepository.findByActorIdAndRound(command.gameId, command.actorRoundId, command.round);
    if (!actorRound) {
      throw new NotFoundError('Actor round', command.actorRoundId);
    }
    // Workspace spec 068, decision 5: the tourniquets of the injuries ask to be loosened (core's rules)
    const tourniquet = actorRound.injuries.some(injury => !!injury.tourniquet) ? await this.tourniquetRules() : undefined;
    actorRound.applyUpkeep({ tourniquet, slowFatigueRecovery: command.slowFatigueRecovery });
    const updated = await this.actorRoundRepository.update(actorRound);
    //TODO notify event bus
    return updated;
  }

  private async tourniquetRules() {
    try {
      return (await this.healingTables.combatRules()).tourniquet;
    } catch (error) {
      this.logger.warn(`Healing tables of core not available, default tourniquet rules: ${(error as Error).message}`);
      return DEFAULT_HEALING_COMBAT_RULES.tourniquet;
    }
  }
}
