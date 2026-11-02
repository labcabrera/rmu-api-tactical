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
