import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { DeleteGamesByStrategicIdCommand } from '../../application/cqrs/commands/delete-games-by-strategic-id.command.js';
import { RemoveDeletedFactionCommand } from '../../application/cqrs/commands/remove-deleted-faction.command.js';
import { SyncFactionPlayersCommand } from '../../application/cqrs/commands/sync-faction-players.command.js';
import { SyncStrategicMembersCommand } from '../../application/cqrs/commands/sync-strategic-members.command.js';
import { ENVIRONMENT_FACTION_ID } from '../../domain/value-objects/environment-faction.vo.js';
import { StrategicMembers } from '../../domain/value-objects/strategic-member.vo.js';

type StrategicGameEvent = { data?: { id?: unknown; owner?: unknown; members?: unknown } };
type FactionEvent = { data?: { id?: unknown; gameId?: unknown; players?: unknown } };

/** An id that can be a key of a Mongo path (`factionPlayers.<id>`). */
const isSafeId = (id: unknown): id is string => typeof id === 'string' && /^[\w-]+$/.test(id);

@Controller()
export class StrategicGameKafkaConsumer {
  private readonly logger = new Logger(StrategicGameKafkaConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  @EventPattern<string>('internal.rmu-strategic.game.deleted.v1')
  async handleStrategicGameDeleted(@Payload() event: any, @Ctx() context: KafkaContext) {
    this.logger.log(`Received event on topic ${context.getTopic()}: ${JSON.stringify(event)}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const strategicGameId = event?.data?.id as string;
    if (strategicGameId) {
      await this.commandBus.execute(new DeleteGamesByStrategicIdCommand(strategicGameId, 'admin', ['admin']));
      this.logger.log(`DeleteGamesByStrategicIdCommand dispatched for strategicGameId: ${strategicGameId}`);
    } else {
      this.logger.warn('strategicGameId not found in event payload');
    }
  }

  /**
   * Workspace spec 072, decision 13: the members of the strategic game reach its tactical games. An event of a strategic
   * version before spec 071 has no members: then only the owner is written, and the members stay as they are.
   */
  @EventPattern<string>('internal.rmu-strategic.game.created.v1')
  async handleStrategicGameCreated(@Payload() event: StrategicGameEvent, @Ctx() context: KafkaContext) {
    await this.syncMembers(event, context);
  }

  @EventPattern<string>('internal.rmu-strategic.game.updated.v1')
  async handleStrategicGameUpdated(@Payload() event: StrategicGameEvent, @Ctx() context: KafkaContext) {
    await this.syncMembers(event, context);
  }

  /** Workspace spec 072, decision 13: the players of a faction reach the tactical games of its strategic game. */
  @EventPattern<string>('internal.rmu-strategic.faction.created.v1')
  async handleFactionCreated(@Payload() event: FactionEvent, @Ctx() context: KafkaContext) {
    await this.syncFactionPlayers(event, context);
  }

  @EventPattern<string>('internal.rmu-strategic.faction.updated.v1')
  async handleFactionUpdated(@Payload() event: FactionEvent, @Ctx() context: KafkaContext) {
    await this.syncFactionPlayers(event, context);
  }

  private async syncMembers(event: StrategicGameEvent, context: KafkaContext) {
    this.logger.log(`Received event on topic ${context.getTopic()}`);
    const data = event?.data;
    if (typeof data?.id !== 'string' || !data.id) {
      this.logger.warn('strategicGameId not found in event payload');
      return;
    }
    const owner = typeof data.owner === 'string' && data.owner ? data.owner : undefined;
    const members = Array.isArray(data.members) ? StrategicMembers.fromEvent(data.members) : undefined;
    if (!owner && !members) return;
    await this.commandBus.execute(new SyncStrategicMembersCommand(data.id, owner, members));
  }

  private async syncFactionPlayers(event: FactionEvent, context: KafkaContext) {
    this.logger.log(`Received event on topic ${context.getTopic()}`);
    const data = event?.data;
    if (!isSafeId(data?.id) || data.id === ENVIRONMENT_FACTION_ID || typeof data.gameId !== 'string' || !data.gameId) {
      this.logger.warn('factionId or gameId not found in event payload');
      return;
    }
    // A faction of a strategic version before spec 072 has no players: nothing to write.
    if (!Array.isArray(data.players)) return;
    await this.commandBus.execute(new SyncFactionPlayersCommand(data.gameId, data.id, StrategicMembers.players(data.players)));
  }

  /** Spec 055: a deleted faction leaves the games still being set up, with its characters and NPC specimens. */
  @EventPattern<string>('internal.rmu-strategic.faction.deleted.v1')
  async handleFactionDeleted(@Payload() event: any, @Ctx() context: KafkaContext) {
    this.logger.log(`Received event on topic ${context.getTopic()}`);
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const factionId = event?.data?.id as string;
    if (factionId && factionId !== ENVIRONMENT_FACTION_ID) {
      await this.commandBus.execute(new RemoveDeletedFactionCommand(factionId));
    } else {
      this.logger.warn('factionId not found in event payload');
    }
  }
}
