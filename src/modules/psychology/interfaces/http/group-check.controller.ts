import { Body, Controller, Get, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GameAccess, GameAccessGuard } from '../../../games/interfaces/http/security/game-access.guard.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import { GetFrightLevelsQuery } from '../../application/cqrs/commands/fear-effect.commands.js';
import type { FrightLevels } from '../../application/cqrs/handlers/fear-effect.handlers.js';
import { FrightLevelsDto } from './dto/fear-effect.dto.js';
import { FearCheckCommand, MoraleCheckCommand, RallyCheckCommand } from '../../application/cqrs/commands/group-check.commands.js';
import type { GroupCheckResult } from '../../application/cqrs/group-check.result.js';
import { FearEaseCommand } from '../../application/cqrs/commands/fear-ease.command.js';
import type { FearEaseResult } from '../../application/cqrs/handlers/fear-ease.handler.js';
import { FearEaseDto, FearEaseResultDto } from './dto/fear-ease.dto.js';
import { FearCheckDto, GroupCheckResultDto, LeaderRollDto, MoraleCheckDto } from './dto/group-check.dto.js';

/** Fear, morale and rally checks of a group of a tactical game (workspace spec 022): game managers only; the fright levels for any reader. */
@UseGuards(JwtAuthGuard, GameAccessGuard)
@Controller('v1/tactical-games')
@ApiTags('Games')
export class GroupCheckController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @GameAccess('manage')
  @Post(':id/fear-checks')
  @HttpCode(200)
  @ApiOkResponse({ type: GroupCheckResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'fearCheck', summary: 'Fear RR of every actor of a group' })
  @ApiErrors({ 400: 'Invalid group, leader or fright level', 404: 'Game or actor not found' })
  async fearCheck(@Param('id') id: string, @Body() dto: FearCheckDto, @CurrentUser() user: AuthenticatedUser) {
    const result = await this.commandBus.execute<FearCheckCommand, GroupCheckResult>(new FearCheckCommand(id, dto, user.id, user.roles));
    return GroupCheckResultDto.from(result);
  }

  /** Workspace spec 100, decision 22: a side won the round, its standing members lose their balk and retreat. */
  @GameAccess('manage')
  @Post(':id/fear-ease')
  @HttpCode(200)
  @ApiOkResponse({ type: FearEaseResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'fearEase', summary: 'Lift the balk and retreat of the standing members of a side' })
  @ApiErrors({ 400: 'Game not started', 404: 'Game or side not found' })
  async fearEase(@Param('id') id: string, @Body() dto: FearEaseDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new FearEaseCommand(id, dto.sideId, user.id, user.roles);
    return FearEaseResultDto.from(await this.commandBus.execute<FearEaseCommand, FearEaseResult>(command));
  }

  @GameAccess('manage')
  @Post(':id/morale-checks')
  @HttpCode(200)
  @ApiOkResponse({ type: GroupCheckResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'moraleCheck', summary: 'Morale roll of the leader of a group' })
  @ApiErrors({ 400: 'Invalid group or leader', 404: 'Game or actor not found' })
  async moraleCheck(@Param('id') id: string, @Body() dto: MoraleCheckDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new MoraleCheckCommand(id, dto, user.id, user.roles);
    return GroupCheckResultDto.from(await this.commandBus.execute<MoraleCheckCommand, GroupCheckResult>(command));
  }

  @GameAccess('manage')
  @Post(':id/rally-checks')
  @HttpCode(200)
  @ApiOkResponse({ type: GroupCheckResultDto, description: 'Success' })
  @ApiOperation({ operationId: 'rallyCheck', summary: 'Rally of the frightened followers of a leader' })
  @ApiErrors({ 400: 'Invalid group or leader, or nobody afraid', 404: 'Game or actor not found' })
  async rallyCheck(@Param('id') id: string, @Body() dto: LeaderRollDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new RallyCheckCommand(id, dto, user.id, user.roles);
    return GroupCheckResultDto.from(await this.commandBus.execute<RallyCheckCommand, GroupCheckResult>(command));
  }

  @GameAccess('read')
  @Get(':id/fright-levels')
  @ApiOkResponse({ type: FrightLevelsDto, description: 'Success' })
  @ApiOperation({
    operationId: 'getFrightLevels',
    summary: 'Fright levels, their modifiers and the thresholds of fallen allies (Table 14-3a), for any participant (spec 068)',
  })
  @ApiErrors({ 404: 'Game not found' })
  async frightLevels(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    const query = new GetFrightLevelsQuery(id, user.id, user.roles);
    return FrightLevelsDto.from(await this.queryBus.execute<GetFrightLevelsQuery, FrightLevels>(query));
  }
}
