import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as realmEventProducer from '../../ports/outbound/realm-event-producer';
import * as realmRepository from '../../ports/outbound/realm-repository';
import { Realm } from '../../../domain/entities/realm';
import { ConflictError } from '../../../domain/errors/errors';
import { CreateRealmCommand } from '../create-realm.command';

@CommandHandler(CreateRealmCommand)
export class CreateRealmCommandHandler implements ICommandHandler<CreateRealmCommand, Realm> {
  private readonly logger = new Logger(CreateRealmCommandHandler.name);

  constructor(
    @Inject('RealmRepository') private readonly realmRepository: realmRepository.RealmRepository,
    @Inject('RealmEventProducer') private readonly realmEventProducer: realmEventProducer.RealmEventProducer,
  ) {}

  async execute(command: CreateRealmCommand): Promise<Realm> {
    this.logger.log(`Creating realm ${command.id} for user ${command.userId}`);
    const exists = await this.realmRepository.findById(command.id);
    if (exists) {
      throw new ConflictError(`Realm ${command.id} already exists`);
    }
    const realm: Partial<Realm> = {
      id: command.id,
      name: command.name,
      description: command.description,
      owner: command.userId,
      createdAt: new Date(),
    };
    const savedRealm = await this.realmRepository.save(realm);
    await this.realmEventProducer.created(savedRealm);
    return savedRealm;
  }
}
