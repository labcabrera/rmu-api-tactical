import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RMU_ADMIN } from '../../../../shared/domain/entities/user-roles.js';
import { ForbiddenError } from '../../../../shared/domain/errors/errors.js';
import type { TacticalStats } from '../../../domain/tactical-stats.js';
import { STATS_READER, type StatsReader } from '../../ports/stats-reader.port.js';
import { GetStatsQuery } from '../queries/get-stats.query.js';

@QueryHandler(GetStatsQuery)
export class GetStatsHandler implements IQueryHandler<GetStatsQuery, TacticalStats> {
  constructor(@Inject(STATS_READER) private readonly reader: StatsReader) {}

  execute(query: GetStatsQuery): Promise<TacticalStats> {
    if (!query.roles.includes(RMU_ADMIN)) throw new ForbiddenError('Only an administrator can read the statistics');
    return this.reader.read(new Date());
  }
}
