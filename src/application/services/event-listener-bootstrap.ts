import { inject, injectable } from 'inversify';
import { EventAdapter } from '@application/ports/inbound/event-adapter';
import { Logger } from '@application/ports/logger';
import { RealmDeletedEventListener } from '../../infrastructure/adapters/inbound/events/realm-deleted-event-listener';
import { TYPES } from '../../shared/types';

@injectable()
export class EventListenerBootstrap {
  constructor(
    @inject(TYPES.KafkaEventAdapter) private readonly eventAdapter: EventAdapter,
    @inject(TYPES.RealmDeletedEventListener) private readonly realmDeletedEventListener: RealmDeletedEventListener,
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async initialize(): Promise<void> {
    this.logger.info('Initializing event listeners...');
    this.eventAdapter.registerEventListener(this.realmDeletedEventListener);
    await this.eventAdapter.start();
    this.logger.info('Event listeners initialized successfully');
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down event listeners...');
    await this.eventAdapter.stop();
    this.logger.info('Event listeners shut down successfully');
  }
}
