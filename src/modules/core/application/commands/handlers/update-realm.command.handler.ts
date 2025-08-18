import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Realm } from '../../../domain/entities/realm';
import { UpdateRealmCommand } from '../update-realm.command';
import * as realmNotificationPort from '../../ports/outbound/realm-event-producer';
import * as realmRepository from '../../ports/outbound/realm-repository';

@CommandHandler(UpdateRealmCommand)
export class UpdateRealmCommandHandler implements ICommandHandler<UpdateRealmCommand, Realm> {
  constructor(
    @Inject('RealmRepository') private readonly realmRepository: realmRepository.RealmRepository,
    @Inject('RealmEventProducer') private readonly realmNotificationPort: realmNotificationPort.RealmEventProducer,
  ) {}

  async execute(command: UpdateRealmCommand): Promise<Realm> {
    const originalRealm = await this.realmRepository.findById(command.id);
    const realm: Partial<Realm> = { ...command, updatedAt: new Date() };
    const updatedRealm = await this.realmRepository.update(realm.id!, realm);
    const changes: Partial<Realm> = {};
    if (originalRealm) {
      if (originalRealm.name !== updatedRealm.name) changes.name = updatedRealm.name;
      if (originalRealm.description !== updatedRealm.description) changes.description = updatedRealm.description;
    }
    await this.realmNotificationPort.updated(updatedRealm);
    return updatedRealm;
  }
}
