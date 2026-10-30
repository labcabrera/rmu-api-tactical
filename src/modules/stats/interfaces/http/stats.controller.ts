import { Controller, Get, UseGuards } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import { GetStatsQuery } from '../../application/cqrs/queries/get-stats.query.js';
import type { TacticalStats } from '../../domain/tactical-stats.js';
import { TacticalStatsDto } from './dto/tactical-stats.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('v1/stats')
@ApiTags('Stats')
export class StatsController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  @ApiOperation({ operationId: 'getStats', summary: 'Counts for the administration dashboard (administrators only)' })
  @ApiOkResponse({ type: TacticalStatsDto })
  @ApiErrors({ 403: 'Not an administrator' })
  get(@CurrentUser() user: AuthenticatedUser): Promise<TacticalStats> {
    return this.queryBus.execute<GetStatsQuery, TacticalStats>(new GetStatsQuery(user.roles));
  }
}
