import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import { Page } from 'src/modules/core/domain/entities/page';
import { Race } from 'src/modules/core/domain/entities/race';
import * as raceRepository from '../../ports/outbound/race-repository';
import { GetRacesQuery } from '../get-races.query';

@QueryHandler(GetRacesQuery)
export class GetRacesQueryHandler implements IQueryHandler<GetRacesQuery, Page<Race>> {
  constructor(@Inject('RaceRepository') private readonly raceRepository: raceRepository.RaceRepository) {}

  async execute(query: GetRacesQuery): Promise<Page<Race>> {
    return await this.raceRepository.findByRsql(query.rsql, query.page, query.size);
  }
}
