import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { SyncFactionPlayersCommand } from '../commands/sync-faction-players.command.js';

/**
 * Copies the players of a strategic faction to all the tactical games of its strategic game (workspace spec 072,
 * decision 13), also those the faction is not in yet: it may be added to them later. They act for its actors (decision 12).
 */
@CommandHandler(SyncFactionPlayersCommand)
export class SyncFactionPlayersHandler implements ICommandHandler<SyncFactionPlayersCommand, number> {
  private readonly logger = new Logger(SyncFactionPlayersHandler.name);

  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  async execute(command: SyncFactionPlayersCommand): Promise<number> {
    const changed = await this.gameRepository.updateFactionPlayers(command.strategicGameId, command.factionId, command.players);
    this.logger.log(`Players of faction ${command.factionId} written on ${changed} tactical games`);
    return changed;
  }
}
