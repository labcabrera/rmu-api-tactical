import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActorRoundAccess, ActorRoundAccessGuard } from '../../../actor-rounds/interfaces/http/security/actor-round-access.guard.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import { ApplyFearEffectCommand } from '../../application/cqrs/commands/fear-effect.commands.js';
import type { FearEffectResult } from '../../application/cqrs/handlers/fear-effect.handlers.js';
import { ApplyFearEffectDto, FearEffectResultDto } from './dto/fear-effect.dto.js';
import { ResistanceRollCommand } from '../../application/cqrs/commands/resistance-roll.command.js';
import type { ActorResistanceRoll } from '../../application/cqrs/handlers/resistance-roll.handler.js';
import { ResistanceRollDto, ResistanceRollResultDto } from './dto/resistance-roll.dto.js';

@UseGuards(JwtAuthGuard, ActorRoundAccessGuard)
@Controller('v1/actor-rounds')
@ApiTags('Actor Rounds')
export class ResistanceRollController {
  constructor(private readonly commandBus: CommandBus) {}

  @ActorRoundAccess('act')
  @Post(':id/resistance-rolls')
  @HttpCode(200)
  @ApiOkResponse({ type: ResistanceRollResultDto, description: 'Success' })
  @ApiOperation({
    operationId: 'resistanceRoll',
    summary: 'Resistance roll of the actor (workspace specs 022 and 040): fear, and physical',
  })
  @ApiErrors({ 400: 'No RR bonus for the actor', 404: 'Actor round not found' })
  async resistanceRoll(@Param('id') id: string, @Body() dto: ResistanceRollDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new ResistanceRollCommand(
      id,
      dto.kind,
      dto.attackLevel,
      dto.roll,
      dto.modifiers ?? [],
      dto.bonus,
      user.id,
      user.roles,
      dto.reason,
      dto.alertId,
    );
    const result = await this.commandBus.execute<ResistanceRollCommand, ActorResistanceRoll>(command);
    return ResistanceRollResultDto.from(result);
  }

  @ActorRoundAccess('act')
  @Post(':id/fear-effects')
  @HttpCode(200)
  @ApiOkResponse({ type: FearEffectResultDto, description: 'Success' })
  @ApiOperation({
    operationId: 'applyFearEffect',
    summary: 'Apply the result of an individual fear RR (spec 068): the actor keeps the worst fear state',
  })
  @ApiErrors({ 404: 'Actor round not found' })
  async applyFearEffect(@Param('id') id: string, @Body() dto: ApplyFearEffectDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new ApplyFearEffectCommand(id, dto.severity, dto.source, user.id, user.roles);
    return FearEffectResultDto.from(await this.commandBus.execute<ApplyFearEffectCommand, FearEffectResult>(command));
  }
}
