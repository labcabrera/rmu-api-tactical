import { inject, injectable } from 'inversify';

import { RealmDeletedEvent } from '@domain/events/realm-deleted.event';

import { Logger } from '@application/ports/logger';
import { TYPES } from '@shared/types';

@injectable()
export class RealmDeletedUseCase {
  constructor(@inject(TYPES.Logger) private readonly logger: Logger) {}

  async execute(event: RealmDeletedEvent): Promise<void> {
    this.logger.info(`Processing realm deleted event for realm: ${event.data.id}`);
    try {
      // TODO: Implement business logic for realm deletion
      // This could include:
      // - Deleting all games associated with the realm
      // - Cleaning up related tactical data
      // - Updating character references
      // - Notifying other bounded contexts
    } catch (error) {
      this.logger.error(`Error processing realm deleted event for realm ${event.data.id}:`, error);
      throw error;
    }
  }
}
