import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { GameAccess, GameAccessGuard } from '../../../games/interfaces/http/security/game-access.guard.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import { FearCheckCommand, MoraleCheckCommand, RallyCheckCommand } from '../../application/cqrs/commands/group-check.commands.js';
import type { GroupCheckResult } from '../../application/cqrs/group-check.result.js';
import { FearCheckDto, GroupCheckResultDto, LeaderRollDto, MoraleCheckDto } from './dto/group-check.dto.js';

/** Fear, morale and rally checks of a group of a tactical game (workspace spec 022): game managers only. */
@UseGuards(JwtAuthGuard, GameAccessGuard)
@Controller('v1/tactical-games')
@ApiTags('Games')
export class GroupCheckController {
  constructor(private readonly commandBus: CommandBus) {}

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
}
