import { inject, injectable } from 'inversify';
import { RealmDeletedUseCase } from '../../../../application/use-cases/realm/realm-deleted.use-case';
import { Realm, RealmDeletedEvent } from '../../../../domain/events/realm-deleted.event';
import { EventListener } from '../../../../domain/ports/inbound/event-listener';
import { Logger } from '../../../../domain/ports/logger';
import { TYPES } from '../../../../shared/types';

@injectable()
export class RealmDeletedEventListener implements EventListener<RealmDeletedEvent, Realm> {
  private static readonly TOPIC = 'internal.rmu-core.realm.deleted.v1';
  private static readonly EVENT_TYPE = 'RealmDeleted';

  constructor(
    @inject(TYPES.RealmDeletedUseCase) private readonly realmDeletedUseCase: RealmDeletedUseCase,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async handle(event: RealmDeletedEvent): Promise<void> {
    this.logger.info(`Received realm deleted event for realm: ${event.data.id}`);
    this.logger.debug(`Received realm deleted event: ${JSON.stringify(event)}`);

    try {
      await this.realmDeletedUseCase.execute(event);
    } catch (error) {
      this.logger.error(`Failed to handle realm deleted event for realm ${event.data.id}:`, error);
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
    if (!messageData || !messageData.data || !messageData.data.id) {
      throw new Error('Invalid message data for RealmDeletedEvent');
    }
    const realm = messageData.data as Realm;
    return new RealmDeletedEvent(realm);
  }
}
