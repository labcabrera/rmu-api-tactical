/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Body, Controller, Logger, Param, Patch, Request, UseGuards } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/modules/auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto';
import { ResolveManeuverCommand } from '../../application/cqrs/commands/resolve-maneuver.commands';
import { Action } from '../../domain/aggregates/action.aggregate';
import { ActionDto } from './dto/action.dto';
import { ResolveManeuverDto } from './dto/resolve-maneuver.dto';

@UseGuards(JwtAuthGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class ManeuverController {
  private readonly logger = new Logger(ManeuverController.name);

  constructor(private commandBus: CommandBus) {}

  @Patch(':id/maneuver/resolve')
  @ApiBody({ type: ResolveManeuverDto })
  @ApiOperation({ operationId: 'resolveManeuver', summary: 'Resolve maneuver' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async resolveManeuver(@Param('id') id: string, @Body() dto: ResolveManeuverDto, @Request() req) {
    this.logger.debug(`Resolving maneuver: ${JSON.stringify(dto)} for user ${req.user}`);
    const user = req.user!;
    const command = ResolveManeuverDto.toCommand(id, dto, user.id as string, user.roles as string[]);
    const entity = await this.commandBus.execute<ResolveManeuverCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
