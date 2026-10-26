import { Body, Controller, HttpCode, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import {
  ApplySpellCommand,
  PreviewSpellQuery,
  ResolveSpellResistanceCommand,
  RollSpellCommand,
  RollSpellFailureCommand,
} from '../../application/cqrs/commands/spell.commands.js';
import type { SpellPreview } from '../../application/cqrs/handlers/spell.handlers.js';
import { Action } from '../../domain/aggregates/action.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { ActionDto } from './dto/action.dto.js';
import {
  ApplySpellDto,
  PreviewSpellDto,
  ResolveSpellResistanceDto,
  RollSpellDto,
  RollSpellFailureDto,
  SpellPreviewDto,
} from './dto/action-spell.dto.js';
import { ActionAccess, ActionAccessGuard } from './security/action-access.guard.js';

/** Resolution of `cast_spell` actions (spec 030): SCR, spell failure, resistance rolls and power points. */
@UseGuards(JwtAuthGuard, ActionAccessGuard)
@Controller('v1/actions')
@ApiTags('Actions')
@ApiErrors({ 400: 'Bad request, invalid data or step', 404: 'Action not found' })
export class SpellController {
  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @ActionAccess('read')
  @Post(':id/spell/preview')
  @HttpCode(200)
  @ApiBody({ type: PreviewSpellDto })
  @ApiOperation({ operationId: 'previewSpell', summary: 'Spellcasting Roll modifiers of some choices (nothing stored)' })
  @ApiOkResponse({ type: SpellPreviewDto })
  async preview(@Param('id') id: string, @Body() dto: PreviewSpellDto, @CurrentUser() user: AuthenticatedUser) {
    const preview = await this.queryBus.execute<PreviewSpellQuery, SpellPreview>(
      new PreviewSpellQuery(id, dto.options ?? {}, user.id, user.roles),
    );
    return SpellPreviewDto.fromPreview(preview);
  }

  @ActionAccess('act')
  @Patch(':id/spell/roll')
  @ApiBody({ type: RollSpellDto })
  @ApiOperation({ operationId: 'rollSpell', summary: 'Spellcasting Roll' })
  @ApiOkResponse({ type: ActionDto })
  async roll(@Param('id') id: string, @Body() dto: RollSpellDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new RollSpellCommand(id, dto.options ?? {}, dto.roll, user.id, user.roles);
    return ActionDto.fromEntity(await this.commandBus.execute<RollSpellCommand, Action>(command));
  }

  @ActionAccess('act')
  @Patch(':id/spell/failure-roll')
  @ApiBody({ type: RollSpellFailureDto })
  @ApiOperation({ operationId: 'rollSpellFailure', summary: 'Spell failure roll of a negative Spellcasting Roll' })
  @ApiOkResponse({ type: ActionDto })
  async failureRoll(@Param('id') id: string, @Body() dto: RollSpellFailureDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new RollSpellFailureCommand(id, dto.roll, dto.realm, user.id, user.roles);
    return ActionDto.fromEntity(await this.commandBus.execute<RollSpellFailureCommand, Action>(command));
  }

  @ActionAccess('act')
  @Patch(':id/spell/resistance-rolls')
  @ApiBody({ type: ResolveSpellResistanceDto })
  @ApiOperation({ operationId: 'resolveSpellResistance', summary: 'Resistance rolls of the targets of a successful cast' })
  @ApiOkResponse({ type: ActionDto })
  async resistanceRolls(@Param('id') id: string, @Body() dto: ResolveSpellResistanceDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new ResolveSpellResistanceCommand(id, dto.targets, user.id, user.roles);
    return ActionDto.fromEntity(await this.commandBus.execute<ResolveSpellResistanceCommand, Action>(command));
  }

  @ActionAccess('act')
  @Patch(':id/spell/apply')
  @ApiBody({ type: ApplySpellDto })
  @ApiOperation({ operationId: 'applySpell', summary: 'Spend the power points of the cast and complete it' })
  @ApiOkResponse({ type: ActionDto })
  async apply(@Param('id') id: string, @Body() dto: ApplySpellDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new ApplySpellCommand(id, dto.powerPoints, user.id, user.roles);
    return ActionDto.fromEntity(await this.commandBus.execute<ApplySpellCommand, Action>(command));
  }
}
