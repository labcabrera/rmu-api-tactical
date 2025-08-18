import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as realmRepository from '../../ports/outbound/realm-repository';
import * as realmNotificationPort from '../../ports/outbound/realm-event-producer';
import { DeleteRealmCommand } from '../delete-realm.command';
import { NotFoundError } from '../../../domain/errors/errors';

@CommandHandler(DeleteRealmCommand)
export class DeleteRealmCommandHandler implements ICommandHandler<DeleteRealmCommand> {
  private readonly logger = new Logger(DeleteRealmCommandHandler.name);

  constructor(
    @Inject('RealmRepository') private readonly realmRepository: realmRepository.RealmRepository,
    @Inject('RealmEventProducer') private readonly realmNotificationPort: realmNotificationPort.RealmEventProducer,
  ) {}

  async execute(command: DeleteRealmCommand): Promise<void> {
    this.logger.log(`Deleting realm ${command.id}`);
    const deleted = await this.realmRepository.deleteById(command.id);
    if (!deleted) {
      throw new NotFoundError('Realm', command.id);
    }
    await this.realmNotificationPort.deleted(deleted);
  }
}
