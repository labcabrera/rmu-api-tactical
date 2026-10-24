import { Body, Controller, Get, Logger, Param, Patch, Query, Request, UseGuards } from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBody, ApiOkResponse, ApiOperation, ApiQuery, ApiResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/jwt.auth.guard';
import { ErrorDto } from '../../../shared/interfaces/http/dto';
import { ResolveManeuverCommand } from '../../application/cqrs/commands/resolve-maneuver.commands';
import { GetManeuverModifiersQuery } from '../../application/cqrs/queries/get-maneuver-modifiers.query';
import type { ManeuverModifiersListing } from '../../application/services/maneuver/maneuver-context.service';
import { Action } from '../../domain/aggregates/action.aggregate';
import { ActionDto } from './dto/action.dto';
import { ManeuverModifiersDto } from './dto/maneuver-modifiers.dto';
import { ResolveManeuverDto } from './dto/resolve-maneuver.dto';
import type { AuthenticatedRequest } from '../../../shared/interfaces/http/authenticated-request';

@UseGuards(JwtAuthGuard)
@Controller('v1/actions')
@ApiTags('Actions')
export class ManeuverController {
  private readonly logger = new Logger(ManeuverController.name);

  constructor(
    private commandBus: CommandBus,
    private queryBus: QueryBus,
  ) {}

  @Get(':id/maneuver/modifiers')
  @ApiOperation({ operationId: 'getManeuverModifiers', summary: 'Modifiers a declared maneuver can take' })
  @ApiQuery({ name: 'skillId', required: false, description: 'Skill to roll with instead of the declared one' })
  @ApiQuery({ name: 'specialization', required: false, description: 'Specialization of the skill' })
  @ApiOkResponse({ type: ManeuverModifiersDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  @ApiResponse({ status: 404, description: 'Action not found', type: ErrorDto })
  async getManeuverModifiers(
    @Param('id') id: string,
    @Query('skillId') skillId: string | undefined,
    @Query('specialization') specialization: string | undefined,
    @Request() req: AuthenticatedRequest,
  ) {
    const user = req.user;
    const query = new GetManeuverModifiersQuery(id, skillId || undefined, specialization || undefined, user.id, user.roles);
    const listing = await this.queryBus.execute<GetManeuverModifiersQuery, ManeuverModifiersListing>(query);
    return ManeuverModifiersDto.fromListing(listing);
  }

  @Patch(':id/maneuver/resolve')
  @ApiBody({ type: ResolveManeuverDto })
  @ApiOperation({ operationId: 'resolveManeuver', summary: 'Resolve maneuver' })
  @ApiOkResponse({ type: ActionDto, description: 'Success' })
  @ApiUnauthorizedResponse({ description: 'Invalid or missing authentication token', type: ErrorDto })
  @ApiResponse({ status: 400, description: 'Bad request, invalid data', type: ErrorDto })
  async resolveManeuver(@Param('id') id: string, @Body() dto: ResolveManeuverDto, @Request() req: AuthenticatedRequest) {
    this.logger.debug(`Resolving maneuver: ${JSON.stringify(dto)} for user ${req.user.id}`);
    const user = req.user;
    const command = ResolveManeuverDto.toCommand(id, dto, user.id, user.roles);
    const entity = await this.commandBus.execute<ResolveManeuverCommand, Action>(command);
    return ActionDto.fromEntity(entity);
  }
}
