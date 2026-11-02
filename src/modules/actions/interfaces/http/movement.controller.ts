import { Body, Controller, Logger, Param, Patch, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../shared/infrastructure/security/jwt-auth.guard.js';
import { ResolveMovementCommand } from '../../application/cqrs/commands/resolve-movement.command.js';
import { Action } from '../../domain/aggregates/action.js';
import { ActionDto } from './dto/action.dto.js';
import { ResolveMovementRequestDto } from './dto/resolve-movement.dto.js';
import { ApiErrors } from '../../../shared/interfaces/http/api-errors.decorator.js';
import { CurrentUser } from '../../../shared/interfaces/http/current-user.decorator.js';
import type { AuthenticatedUser } from '../../../shared/interfaces/http/authenticated-request.js';
import { ActionAccess, ActionAccessGuard } from './security/action-access.guard.js';

@UseGuards(JwtAuthGuard, ActionAccessGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class MovementController {
  private readonly logger = new Logger(MovementController.name);

  constructor(private commandBus: CommandBus) {}

  @ActionAccess('act')
  @Patch(':id/movement/resolve')
  @ApiBody({ type: ResolveMovementRequestDto })
  @ApiOperation({ operationId: 'resolveMovement', summary: 'Resolve movement' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiErrors({ 400: 'Bad request, invalid data' })
  async resolveMovement(@Param('id') id: string, @Body() dto: ResolveMovementRequestDto, @CurrentUser() user: AuthenticatedUser) {
    this.logger.debug(`Resolving movement: ${JSON.stringify(dto)} for user ${user.id}`);
    const command = ResolveMovementRequestDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<ResolveMovementCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
