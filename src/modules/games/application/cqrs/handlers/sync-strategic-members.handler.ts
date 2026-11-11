import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import { type GameRepository, GAME_REPOSITORY } from '../../ports/game-repository.port.js';
import { SyncStrategicMembersCommand } from '../commands/sync-strategic-members.command.js';

/**
 * Copies the members of a strategic game, and its owner, to all its tactical games (workspace spec 072, decision 13).
 * The game guard reads them: the members read the games and the masters manage them (decision 11).
 */
@CommandHandler(SyncStrategicMembersCommand)
export class SyncStrategicMembersHandler implements ICommandHandler<SyncStrategicMembersCommand, number> {
  private readonly logger = new Logger(SyncStrategicMembersHandler.name);

  constructor(@Inject(GAME_REPOSITORY) private readonly gameRepository: GameRepository) {}

  async execute(command: SyncStrategicMembersCommand): Promise<number> {
    const changed = await this.gameRepository.updateStrategicMembers(command.strategicGameId, command.strategicGameOwner, command.members);
    this.logger.log(`Members of strategic game ${command.strategicGameId} written on ${changed} tactical games`);
    return changed;
  }
}
