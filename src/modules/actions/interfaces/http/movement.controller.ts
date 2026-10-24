import { Body, Controller, Logger, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto';
import { ResolveMovementCommand } from '../../application/cqrs/commands/resolve-movement.command';
import { Action } from '../../domain/aggregates/action.aggregate';
import { ActionDto } from './dto/action.dto';
import { ResolveMovementRequestDto } from './dto/resolve-movement.dto';
import type { AuthenticatedRequest } from '../../../shared/interfaces/http/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class MovementController {
  private readonly logger = new Logger(MovementController.name);

  constructor(private commandBus: CommandBus) {}

  @Patch(':id/movement/resolve')
  @ApiBody({ type: ResolveMovementRequestDto })
  @ApiOperation({ operationId: 'resolveMovement', summary: 'Resolve movement' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async resolveMovement(@Param('id') id: string, @Body() dto: ResolveMovementRequestDto, @Request() req: AuthenticatedRequest) {
    this.logger.debug(`Resolving movement: ${JSON.stringify(dto)} for user ${req.user.id}`);
    const user = req.user;
    const command = ResolveMovementRequestDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<ResolveMovementCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
