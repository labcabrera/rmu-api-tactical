import { Body, Controller, Logger, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { ResolveMedicalCommand, ResolveUseItemCommand } from '../../application/cqrs/commands/medical-action.commands.js';
import { Action } from '../../domain/aggregates/action.js';
import { ActionDto } from './dto/action.dto.js';
import { ResolveMedicalDto, ResolveUseItemDto } from './dto/resolve-medical.dto.js';
import { ActionAccess, ActionAccessGuard } from './security/action-access.guard.js';

/** Workspace spec 068: the resolution of `medical` and `use_item` actions. */
@UseGuards(JwtAuthGuard, ActionAccessGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class MedicalController {
  private readonly logger = new Logger(MedicalController.name);

  constructor(private commandBus: CommandBus) {}

  @ActionAccess('act')
  @Patch(':id/medical/resolve')
  @ApiBody({ type: ResolveMedicalDto })
  @ApiOperation({
    operationId: 'resolveMedical',
    summary: 'Resolve the next round of 4 AP of a medical action: the first rolls Medicine, the last applies the treatment',
  })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Not a medical action, AP below a round, or the round is already resolved', 404: 'Action not found' })
  async resolveMedical(@Param('id') id: string, @Body() dto: ResolveMedicalDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Resolving medical action ${id}: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = new ResolveMedicalCommand(
      id,
      dto.roll,
      dto.unmodifiedRoll,
      dto.heatHitsRoll,
      dto.heatCriticalRoll,
      dto.herbalismRoll,
      user.id,
      user.roles,
    );
    return ActionDto.fromEntity(await this.commandBus.execute<ResolveMedicalCommand, Action>(command));
  }

  @ActionAccess('act')
  @Patch(':id/use-item/resolve')
  @ApiBody({ type: ResolveUseItemDto })
  @ApiOperation({ operationId: 'resolveUseItem', summary: 'Resolve a use_item action: the healing item heals its target' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Not a use_item action, or AP below its cost', 404: 'Action or item not found' })
  async resolveUseItem(@Param('id') id: string, @Body() dto: ResolveUseItemDto, @CurrentUser() user: AuthenticatedUser) {
    const command = new ResolveUseItemCommand(id, dto.roll, user.id, user.roles);
    return ActionDto.fromEntity(await this.commandBus.execute<ResolveUseItemCommand, Action>(command));
  }
}
