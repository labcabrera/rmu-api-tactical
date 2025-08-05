import { inject, injectable } from 'inversify';
import { RealmDeletedUseCase } from '../../../../application/use-cases/realm/realm-deleted.use-case';
import { RealmDeletedEvent } from '../../../../domain/events/realm-deleted.event';
import { EventListener } from '../../../../domain/ports/inbound/event-listener';
import { Logger } from '../../../../domain/ports/logger';
import { TYPES } from '../../../../shared/types';

@injectable()
export class RealmDeletedEventListener implements EventListener<RealmDeletedEvent> {

  private static readonly TOPIC = 'internal.rmu-core.realm.deleted.v1';
  private static readonly EVENT_TYPE = 'RealmDeleted';

  constructor(
    @inject(TYPES.RealmDeletedUseCase) private readonly realmDeletedUseCase: RealmDeletedUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async handle(event: RealmDeletedEvent): Promise<void> {
    this.logger.info(`Received realm deleted event for realm: ${event.realmId}`);
    
    try {
      await this.realmDeletedUseCase.execute(event);
    } catch (error) {
      this.logger.error(`Failed to handle realm deleted event for realm ${event.realmId}:`, error);
      throw error;
    }
  }

  getEventType(): string {
    return RealmDeletedEventListener.EVENT_TYPE;
  }

  getTopic(): string {
    return RealmDeletedEventListener.TOPIC;
  }

  /**
   * Creates a RealmDeletedEvent from raw Kafka message data
   * @param messageData Raw message data from Kafka
   */
  static createEventFromMessage(messageData: any): RealmDeletedEvent {
    return new RealmDeletedEvent(
      messageData.realmId,
      messageData.realmName,
      new Date(messageData.deletedAt)
    );
  }
}
