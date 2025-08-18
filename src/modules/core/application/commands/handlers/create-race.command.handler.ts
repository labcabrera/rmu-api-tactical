import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';

import * as raceRepository from '../../ports/outbound/race-repository';
import * as realmRepository from '../../ports/outbound/realm-repository';
import * as realmNotificationPortCopy from '../../ports/outbound/race-event-producer';
import { Race } from '../../../domain/entities/race';
import { ValidationError, ConflictError } from '../../../domain/errors/errors';
import { CreateRaceCommand } from '../create-race.command';

@CommandHandler(CreateRaceCommand)
export class CreateRaceCommandHandler implements ICommandHandler<CreateRaceCommand, Race> {
  constructor(
    @Inject('RaceRepository') private readonly raceRepository: raceRepository.RaceRepository,
    @Inject('RealmRepository') private readonly realmRepository: realmRepository.RealmRepository,
    @Inject('RaceEventProducer') private readonly raceNotificationPort: realmNotificationPortCopy.RaceEventProducer,
  ) {}

  async execute(command: CreateRaceCommand): Promise<Race> {
    const realm = await this.realmRepository.findById(command.realm);
    if (!realm) {
      throw new ValidationError(`Realm with id ${command.realm} does not exist`);
    }
    const existing = await this.raceRepository.findById(command.id);
    if (existing) {
      throw new ConflictError(`Race with id ${command.id} already exists`);
    }
    const race: Partial<Race> = {
      id: command.id,
      name: command.name,
      realm: command.realm,
      size: command.size,
      defaultStatBonus: command.defaultStatBonus,
      resistances: command.resistances,
      averageHeight: command.averageHeight,
      averageWeight: command.averageWeight,
      strideBonus: command.strideBonus,
      enduranceBonus: command.enduranceBonus,
      recoveryMultiplier: command.recoveryMultiplier,
      baseHits: command.baseHits,
      bonusDevPoints: command.bonusDevPoints,
      description: command.description,
      owner: command.userId,
      createdAt: new Date(),
    };
    const savedRace = await this.raceRepository.save(race);
    await this.raceNotificationPort.created(savedRace);
    return savedRace;
  }
}
