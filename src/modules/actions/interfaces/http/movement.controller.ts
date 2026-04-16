/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Logger, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto';
import { ResolveMovementCommand } from '../../application/cqrs/commands/resolve-movement.command';
import { Action } from '../../domain/aggregates/action.aggregate';
import { ActionDto } from './dto/action.dto';
import { PrepareAttackDto } from './dto/prepare-attack.dto';
import { ResolveMovementRequestDto } from './dto/resolve-movement.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class MovementController {
  private readonly logger = new Logger(MovementController.name);

  constructor(private commandBus: CommandBus) {}

  @Patch(':id/movement/resolve')
  @ApiBody({ type: PrepareAttackDto })
  @ApiOperation({ operationId: 'resolveMovement', summary: 'Resolve movement' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async resolveMovement(@Param('id') id: string, @Body() dto: ResolveMovementRequestDto, @Request() req) {
    this.logger.debug(`Resolving movement: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = ResolveMovementRequestDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ResolveMovementCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
