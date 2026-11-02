import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { DeleteGamesByStrategicIdCommand } from '../../application/cqrs/commands/delete-games-by-strategic-id.command.js';
import { RemoveDeletedFactionCommand } from '../../application/cqrs/commands/remove-deleted-faction.command.js';
import { ENVIRONMENT_FACTION_ID } from '../../domain/value-objects/environment-faction.vo.js';

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
