import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import { Race } from '../../../domain/entities/race';
import { UpdateRaceCommand } from '../update-race.command';
import * as raceNotificationPort from '../../ports/outbound/race-event-producer';
import * as raceRepository from '../../ports/outbound/race-repository';
import * as realmRepository from '../../ports/outbound/realm-repository';
import { ValidationError } from '../../../domain/errors/errors';

@CommandHandler(UpdateRaceCommand)
export class UpdateRaceCommandHandler implements ICommandHandler<UpdateRaceCommand, Race> {
  constructor(
    @Inject('RaceRepository') private readonly raceRepository: raceRepository.RaceRepository,
    @Inject('RealmRepository') private readonly realmRepository: realmRepository.RealmRepository,
    @Inject('RaceEventProducer') private readonly raceNotificationPort: raceNotificationPort.RaceEventProducer,
  ) {}

  async execute(command: UpdateRaceCommand): Promise<Race> {
    if (command.realm) {
      const realm = await this.realmRepository.findById(command.realm);
      if (!realm) {
        throw new ValidationError(`Realm with id ${command.realm} does not exist`);
      }
    }
    const race: Partial<Race> = { ...command, updatedAt: new Date() };
    const updated = await this.raceRepository.update(command.id, race);
    await this.raceNotificationPort.updated(updated);
    return updated;
  }
}
