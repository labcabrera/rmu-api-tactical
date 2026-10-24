import { Body, Controller, HttpCode, Param, Post, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ActorRoundAccess, ActorRoundAccessGuard } from '../../../actor-rounds/interfaces/http/security/actor-round-access.guard.js';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
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
  @ApiOperation({ operationId: 'resistanceRoll', summary: 'Resistance roll of the actor (workspace spec 022): only fear for now' })
  @ApiErrors({ 400: 'No RR bonus for the actor', 404: 'Actor round not found' })
  async resistanceRoll(@Param('id') id: string, @Body() dto: ResistanceRollDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new ResistanceRollCommand(id, dto.kind, dto.attackLevel, dto.roll, dto.modifiers ?? [], dto.bonus, user.id, user.roles);
    const result = await this.commandBus.execute<ResistanceRollCommand, ActorResistanceRoll>(command);
    return ResistanceRollResultDto.from(result);
  }
}
