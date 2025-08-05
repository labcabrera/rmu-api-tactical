import { inject, injectable } from 'inversify';
import { RealmDeletedEvent } from '../../../domain/events/realm-deleted.event';
import { Logger } from '../../../domain/ports/logger';
import { TYPES } from '../../../shared/types';

@injectable()
export class RealmDeletedUseCase {

  constructor(
    @inject(TYPES.Logger) private readonly logger: Logger
  ) {}

  async execute(event: RealmDeletedEvent): Promise<void> {
    this.logger.info(`Processing realm deleted event for realm: ${event.realmId}`);
    
    try {
      // TODO: Implement business logic for realm deletion
      // This could include:
      // - Deleting all games associated with the realm
      // - Cleaning up related tactical data
      // - Updating character references
      // - Notifying other bounded contexts
      
      this.logger.info(`Realm ${event.realmId} (${event.realmName}) deletion processed successfully`);
      
    } catch (error) {
      this.logger.error(`Error processing realm deleted event for realm ${event.realmId}:`, error);
      throw error;
    }
  }
}
