import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import * as raceRepository from '../../ports/outbound/race-repository';
import { Race } from 'src/modules/core/domain/entities/race';
import { GetRaceQuery } from '../get-race.query';
import { NotFoundError } from 'src/modules/core/domain/errors/errors';

@QueryHandler(GetRaceQuery)
export class GetRaceQueryHandler implements IQueryHandler<GetRaceQuery, Race> {
  constructor(@Inject('RaceRepository') private readonly raceRepository: raceRepository.RaceRepository) {}

  async execute(query: GetRaceQuery): Promise<Race> {
    const data = await this.raceRepository.findById(query.id);
    if (!data) {
      throw new NotFoundError('Race', query.id);
    }
    return data;
  }
}
