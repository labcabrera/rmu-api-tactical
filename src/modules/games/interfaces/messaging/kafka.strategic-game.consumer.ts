import { Controller, Logger } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { Ctx, EventPattern, KafkaContext, Payload } from '@nestjs/microservices';
import { DeleteGamesByStrategicIdCommand } from '../../application/cqrs/commands/delete-games-by-strategic-id.command';

@Controller()
export class StrategicGameKafkaConsumer {
  private readonly logger = new Logger(StrategicGameKafkaConsumer.name);

  constructor(private readonly commandBus: CommandBus) {}

  //TODO fix core -> strategic on rmu-api-tactical
  @EventPattern('internal.rmu-core.game.deleted.v1')
  async handleStrategicGameDeleted(@Payload() event: any, @Ctx() context: KafkaContext) {
    this.logger.log(`Received event on topic ${context.getTopic()}: ${JSON.stringify(event)}`);
    const strategicGameId = event?.data?.id as string;
    if (strategicGameId) {
      await this.commandBus.execute(new DeleteGamesByStrategicIdCommand(strategicGameId, 'admin', ['admin']));
      this.logger.log(`DeleteGamesByStrategicIdCommand dispatched for strategicGameId: ${strategicGameId}`);
    } else {
      this.logger.warn('strategicGameId not found in event payload');
    }
  }
}
